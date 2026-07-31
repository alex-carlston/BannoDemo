# Banno Pulse — Security

**Live Worker:** `https://banno-pulse.hackathon-16b.workers.dev`  
**Related:** [architecture.md](./architecture.md) · [README.md](./README.md)

How the plugin protects member data at the Cloudflare edge: identity, sessions, browser controls, storage, and abuse limits.

---

## Goals

1. Prove identity with Banno OIDC (not self-asserted claims)
2. Keep OAuth tokens and secrets off the browser
3. Isolate each member’s data (sessions + D1 goals)
4. Fail closed on auth, rate limits, and secret misconfiguration

---

## Trust boundaries

```
[Member Browser]
       │
       ▼
[Banno Online Banking iframe] ──HTTPS──► [Banno Pulse Worker]
                                              │
                         ┌────────────────────┼────────────────────┐
                         ▼                    ▼                    ▼
                  [Banno OIDC]        [Banno Consumer API]   [KV + D1]
```

| Asset | Where it lives | Sensitivity |
|-------|----------------|-------------|
| Access / refresh tokens | Encrypted KV | Critical |
| Session cookie (`__Secure-session_id`) | Browser (`httpOnly`) | High |
| `CLIENT_SECRET`, `SESSION_ENC_SECRET`, `COOKIE_SIGNING_SECRET` | Wrangler secrets | Critical |
| Account / transaction / document data | Ephemeral SSR only | High |
| Savings goals | D1 (scoped by `user_id`) | Medium |

---

## Authentication

### Sign-in

1. Member hits **Sign in** → `GET /auth/login` (rate-limited). The public landing page does **not** create OAuth state.
2. Worker generates PKCE (`S256`), `state`, and `nonce`; stores `{ codeVerifier, nonce }` encrypted in KV under `auth_state:{state}` (10 min TTL).
3. Redirect to Banno authorize; callback exchanges the code **server-side**.
4. ID token is verified before any session is created (see below).
5. Encrypted session written to KV; signed `__Secure-session_id` cookie set.

### ID token verification (`src/utils/crypto.ts`)

| Check | Behavior |
|-------|----------|
| Signature | JWKS from Banno discovery — RS256 / PS256 / ES256 |
| Issuer / audience | Must match discovery `issuer` and `CLIENT_ID` |
| Expiry | Enforced |
| `iat` / `nbf` | Enforced with 120s clock-skew leeway |
| Nonce | Must match value stored with OAuth state |
| Subject | Non-empty `sub` required |
| JWKS cache | 5 minutes; one forced refresh on verify failure |

### Session cookie

| Attribute | Value |
|-----------|-------|
| Name | `__Secure-session_id` |
| Signing | HMAC via `COOKIE_SIGNING_SECRET` (must differ from encryption secret — enforced at runtime) |
| Flags | `httpOnly`, `secure`, `SameSite=None`, `Partitioned`, `path=/` |
| Absolute TTL | 30 days |
| Idle timeout | 30 minutes |

### Logout

- **POST `/logout`** only (CSRF-protected). GET `/logout` redirects home with no side effects.
- Uses a raw session peek (ignores idle) so refresh tokens are still revoked after idle expiry.
- Revokes the refresh token at Banno, then deletes `session:*` and matching `user_session:*`.

Idle timeout and session replacement on re-login also revoke before deleting local keys.

---

## Authorization

| Resource | Rule |
|----------|------|
| Plugin pages | Valid signed cookie → encrypted session |
| `POST /api/goals*` | `requireSession` + CSRF (Origin required) |
| Goal rows | `WHERE user_id = ?` from session (never from form body) |
| Banno API calls | Server-side Bearer token from session only |

---

## Secrets

| Name | Kind | Purpose |
|------|------|---------|
| `CLIENT_SECRET` | secret | OAuth confidential client |
| `SESSION_ENC_SECRET` | secret | AES-GCM for KV payloads |
| `COOKIE_SIGNING_SECRET` | secret | Cookie HMAC (≠ encryption secret) |
| `CLIENT_ID` | var | Public OAuth client id |
| `ENV_URI` / `REDIRECT_URI` | var | FI base URL + callback |

- Secrets never live in `wrangler.jsonc` `vars`
- Docker deploy: values from `.env` (gitignored) uploaded via quickstart `--secrets-file`
- Optional host local: `.dev.vars` (gitignored); production can also use `wrangler secret put …`
- `REDIRECT_URI` validated: HTTPS, non-localhost in production, callback path
- Boot/auth paths reject missing secrets or equal cookie/encryption secrets

KV encryption uses AES-GCM; there is no plaintext fallback when secrets are configured.

---

## Browser controls

### CORS (credentialed)

Allowed origins:

- Exact origin of `ENV_URI`
- Loopback only when `ENVIRONMENT=development` or the Worker host is local

Corporate wildcards (`*.banno.com`, `*.jackhenry.com`) are **not** allowed for credentialed CORS. Framing still uses CSP `frame-ancestors` with `ENV_URI`.

### CSRF

- Applied to mutating routes outside `/auth` and `/callback`
- **Missing `Origin` is rejected**
- Allowed: same Worker origin, `ENV_URI`, optional localhost in development

### Content-Security-Policy

```
default-src 'self'
script-src 'self'
style-src 'self' https://fonts.googleapis.com
img-src 'self' https: data:
font-src 'self' https://fonts.gstatic.com
connect-src 'self'
frame-ancestors 'self' {ENV_URI}
form-action 'self' {ENV_URI}
frame-src 'self' {ENV_URI}
base-uri 'self'
upgrade-insecure-requests
```

No `'unsafe-inline'` styles — dynamic UI uses SVG attributes and CSS classes. Static `ASSETS` responses get the same CSP family (including `frame-ancestors`) plus HSTS / nosniff / referrer policy.

Also set: HSTS (preload), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

### Rate limits (fail closed)

| Prefix | Max / window |
|--------|----------------|
| `/callback/plugin` | 20 / 60s (authenticated SSR) |
| `/auth/` | 20 / 60s |
| `/callback` | 30 / 60s (OAuth code exchange) |
| `/api/` | 40 / 60s |

Counters use fixed time buckets per IP. Corrupt counters or KV errors return **503** (not open). Longest prefix wins so plugin SSR does not share the OAuth callback budget.

---

## Data protection

| Data | At rest | In transit | Browser |
|------|---------|------------|---------|
| Tokens | AES-GCM in KV | TLS | Never |
| Session id | Signed cookie | TLS | `httpOnly` only |
| Accounts / txs | Not persisted | TLS | SSR HTML (masked account numbers) |
| Goals | D1 SQLite | TLS | SSR HTML |

Goals capped at **50 per user**, amounts ≤ **1e12**, finite numbers only. Clients only see safe error strings; details stay in logs with `requestId`.

---

## Operational notes

After secret rotation:

1. `npx wrangler secret list` — confirm all three secrets  
2. `npm run deploy`  
3. Members must re-authenticate (old sessions invalid)  
4. Smoke: login → tabs → create/delete goal → **POST** logout  

Re-review when OAuth/session/cookie paths, mutating APIs, major dependency upgrades, or multi-FI deploys change.
