# Banno Pulse — Security

**Status:** Production posture after July 27, 2026 hardening  
**Live Worker:** `https://banno-pulse.hackathon-16b.workers.dev`  
**Related:** [architecture.md](./architecture.md) · [README.md](./README.md)

---

## Overview

Banno Pulse is a Banno Online Banking iframe plugin. It handles member financial data at the Cloudflare edge. Security goals:

1. Prove identity with Banno OIDC (not self-asserted claims)
2. Keep OAuth tokens and secrets off the browser
3. Isolate each member’s data (sessions + D1 goals)
4. Fail closed on auth, rate limits, and secret misconfiguration

**Current risk rating:** Low

---

## Threat Model

### Assets

| Asset | Storage | Sensitivity |
|-------|---------|-------------|
| Access / refresh tokens | Encrypted KV | Critical |
| Session cookie (`__Secure-session_id`) | Browser (`httpOnly`) | High |
| `CLIENT_SECRET`, `SESSION_ENC_SECRET`, `COOKIE_SIGNING_SECRET` | Wrangler secrets | Critical |
| Account / transaction / document data | Ephemeral SSR only | High |
| Savings goals | D1 (scoped by `user_id`) | Medium |

### Trust boundaries

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

### Primary threats (mitigated)

| Threat | Mitigation |
|--------|------------|
| Session forgery / token theft | Separate cookie HMAC secret; AES-GCM KV encryption; rotated secrets |
| Forged identity (`sub`) | JWKS-verified ID token + `iss`/`aud`/`exp`/`nonce` |
| CSRF on goal mutations | Hono CSRF + hostname allowlists |
| Cross-tenant goal access | D1 queries always bind session `user_id` |
| Clickjacking / hostile embeds | CSP `frame-ancestors` limited to `ENV_URI` |
| Secret exposure in config | Secrets only via Wrangler / `.dev.vars` (gitignored) |
| Error-based recon | Generic client messages; details logged with `requestId` only |
| Brute / flood on auth | IP rate limits on `/auth/*`, `/callback*`, `/api/*` (fail closed) |

---

## Authentication & Sessions

### OAuth 2.0 + PKCE + OIDC

1. Generate PKCE (`S256`), `state`, and `nonce`
2. Store `{ codeVerifier, nonce }` in encrypted KV under `auth_state:{state}` (10 min TTL)
3. Redirect to Banno authorize endpoint
4. On callback: consume state (single-use), exchange code server-side
5. Verify `id_token` cryptographically (see below)
6. Create encrypted session; set signed cookie

### ID token verification (`src/utils/crypto.ts`)

| Check | Detail |
|-------|--------|
| Signature | JWKS from `{ENV_URI}/a/consumer/api/v0/oidc/jwks` — RS256 / PS256 / ES256 |
| Issuer | Must match OIDC discovery `issuer` |
| Audience | Must include `CLIENT_ID` |
| Expiry / nbf | Enforced with small clock skew on `nbf` |
| Nonce | Must match value stored with OAuth state |
| Subject | Non-empty `sub` required before session bind |

### Session cookie

| Attribute | Value |
|-----------|-------|
| Name | `__Secure-session_id` |
| Signing | HMAC via **`COOKIE_SIGNING_SECRET`** (not the encryption secret) |
| Flags | `httpOnly`, `secure`, `SameSite=None`, `Partitioned`, `path=/` |
| Absolute TTL | 30 days |
| Idle timeout | 30 minutes (`lastActivityAt`) |

### Logout

1. Revoke refresh token at Banno `/oidc/token/revocation`
2. Delete KV `session:*` and `user_session:*`
3. Clear cookie

---

## Authorization

| Resource | Rule |
|----------|------|
| Plugin pages | Valid signed cookie → encrypted session |
| `POST /api/goals*` | `requireSession` middleware + CSRF |
| Goal rows | `WHERE user_id = ?` from session (never from form body) |
| Banno API calls | Server-side Bearer token from session only |

---

## Secrets & Configuration

| Name | Kind | Purpose |
|------|------|---------|
| `CLIENT_SECRET` | secret | OAuth confidential client |
| `SESSION_ENC_SECRET` | secret | AES-GCM for KV payloads |
| `COOKIE_SIGNING_SECRET` | secret | Cookie HMAC (must differ from encryption secret) |
| `CLIENT_ID` | var | Public OAuth client id |
| `ENV_URI` / `REDIRECT_URI` | var | FI base URL + callback |

Rules:

- Never place secrets in `wrangler.jsonc` `vars`
- Local: `.dev.vars` (gitignored); template: `.dev.vars.example`
- Production: `wrangler secret put …`
- `REDIRECT_URI` validated at auth time: HTTPS, non-localhost in production, callback path

---

## Network & Browser Controls

### CORS / CSRF origins (`src/utils/origins.ts`)

Allowed:

- Exact origin of `ENV_URI`
- Hostnames under `*.banno.com` or `*.jackhenry.com` (suffix-safe)
- Loopback (`localhost`, `127.0.0.1`) only when `ENVIRONMENT=development` or request host is local

Substring matching (e.g. `includes('garden-fi')`) is intentionally not used.

### Content-Security-Policy

```
default-src 'self'
script-src 'self'
style-src 'self' https://fonts.googleapis.com 'unsafe-inline'
img-src 'self' https: data:
font-src 'self' https://fonts.gstatic.com
connect-src 'self'
frame-ancestors 'self' {ENV_URI}
form-action 'self' {ENV_URI}
frame-src 'self' {ENV_URI}
base-uri 'self'
upgrade-insecure-requests
```

Also set: HSTS (preload), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

Static assets use `run_worker_first` so unmatched paths fall through to `ASSETS` with security headers applied.

### Rate limits (fail closed)

| Prefix | Max / window |
|--------|----------------|
| `/auth/` | 20 / 60s |
| `/callback` | 30 / 60s |
| `/api/` | 40 / 60s |

If KV is unavailable, rate-limited paths return **503** (not open).

---

## Data Protection

| Data | At rest | In transit | Browser |
|------|---------|------------|---------|
| Tokens | AES-GCM in KV | TLS | Never |
| Session id | Signed cookie | TLS | `httpOnly` only |
| Accounts / txs | Not persisted | TLS | SSR HTML (masked account numbers) |
| Goals | D1 SQLite | TLS | SSR HTML |

Goals are capped at **50 per user** and amounts ≤ **1e12**. Inputs must be finite numbers.

KV decryption never falls back to plaintext when encryption secrets are configured.

---

## Error Handling & Logging

- Clients see only safe strings (`SAFE_AUTH_ERROR`, `SAFE_SERVER_ERROR`, …)
- Server logs: short message + `requestId` + path — no token or OAuth error bodies to the browser
- Dashboard data failures show a generic “could not be loaded” banner
- Observability: 10% head sampling; invocation logs disabled

---

## Security Controls Matrix

| Control | Status |
|---------|--------|
| OAuth 2.0 + PKCE (S256) + nonce | Strong |
| ID token JWKS verification | Strong |
| Encrypted sessions + separate cookie secret | Strong |
| Idle + absolute session timeouts | Strong |
| CSRF + origin allowlists | Strong |
| XSS (JSX escape + CSP) | Strong |
| Parameterized D1 / user scoping | Strong |
| Rate limiting (fail closed) | Strong |
| Secret management (Wrangler secrets) | Strong |
| Token revocation on logout | Strong |
| iframe framing control | Strong |

---

## Operational Checklist

After secret rotation or major auth changes:

1. Confirm secrets: `npx wrangler secret list`  
   Required: `CLIENT_SECRET`, `SESSION_ENC_SECRET`, `COOKIE_SIGNING_SECRET`
2. Deploy: `npm run deploy`
3. Expect all members to **re-authenticate** (old sessions invalid after key rotation)
4. Smoke test: login → tabs → create/delete goal → logout

---

## Audit History

| Date | Result |
|------|--------|
| 2026-07-27 | Full audit: 2 Critical, 6 High, 9 Medium, 7 Low |
| 2026-07-27 | All Critical/High/Medium and actionable Low findings remediated; Worker redeployed |

### Remediation map (reference)

| ID | Finding | Resolution |
|----|---------|------------|
| C-1 | Encryption secret in `vars` | Moved to Wrangler secret; rotated |
| C-2 | Unverified ID token | JWKS + claim + nonce verification |
| H-1 / H-2 | Weak CORS/CSRF matching | Hostname allowlists |
| H-3 / H-6 | Error leakage | Safe client messages |
| H-4 | Fail-open / narrow rate limits | Broader limits; fail closed |
| H-5 | Shared crypto + cookie key | `COOKIE_SIGNING_SECRET` |
| M-1 | No revocation | OIDC revoke on logout |
| M-2 | Mixed time units | Unix seconds throughout |
| M-3 | Plaintext KV fallback | Removed when secrets required |
| M-4 | Unbounded goals | Caps + validation |
| M-5 | Cross-site cookie | `Partitioned` |
| M-6 | XSS blocklist | Removed; CSP + allowlists |
| M-7 | 100% log sampling | 10%; no invocation logs |
| M-8 | Unused session middleware | `requireSession` on `/api/*` |
| M-9 | Weak redirect URI checks | `assertValidRedirectUri()` |
| L-* | Misc | CSP upgrade, asset headers, idle timeout, form cleanup |

---

## Re-audit Triggers

Re-run a security review when any of these change:

- OAuth / session / cookie code paths
- New mutating API routes
- Dependency upgrades (especially Hono)
- New FI / multi-tenant deployment
- Secret rotation procedures

*Keep this document aligned with the deployed Worker. Prefer describing current controls first; keep audit history as appendix.*

---

## Related Documents

- [architecture.md](./architecture.md) — system design  
- [README.md](./README.md) — setup overview  
- [docs/plugin-starter.md](./docs/plugin-starter.md) — reusable kit for your own plugin  
- [docs/setup-cloudflare.md](./docs/setup-cloudflare.md) — Workers / KV / secrets  
- [docs/setup-node.md](./docs/setup-node.md) — Node.js tooling  
