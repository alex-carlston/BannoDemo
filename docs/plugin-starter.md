# Build your own Banno plugin (starter kit)

This repo is both a working product (**Banno Pulse**) and a **sample** of how to ship a secure Banno iframe plugin on Cloudflare Workers.

Use this guide when you want your own plugin — not Pulse’s dashboard — while keeping the hardened auth/session stack.

---

## Mental model

```
┌──────────────────────────────────────────────┐
│  YOUR PLUGIN UI + BUSINESS LOGIC             │  ← replace
│  pages · components · D1 tables · API calls  │
└──────────────────────▲───────────────────────┘
                       │ imports from
┌──────────────────────┴───────────────────────┐
│  src/plugin  — STARTER KIT                   │  ← reuse
│  OAuth/PKCE · JWKS · sessions · CORS/CSRF    │
└──────────────────────▲───────────────────────┘
                       │ runs on
┌──────────────────────┴───────────────────────┐
│  Cloudflare Workers + KV (+ optional D1)     │
└──────────────────────────────────────────────┘
```

| Keep (kit) | Replace (Pulse-specific) |
|------------|--------------------------|
| `src/plugin/*` (and modules it re-exports) | `src/routes/page.routes.tsx` |
| Auth routes pattern (`/auth/login`, `/callback`, `/logout`) | `src/components/views.tsx` |
| Middleware: CSP, CORS, CSRF, rate limits | Goals / insights / health score |
| Encrypted session + cookie secrets | Any Consumer API calls you don’t need |

Entry export: [`src/plugin/index.ts`](../src/plugin/index.ts)

---

## Prerequisites

Complete these first:

1. Main [README](../README.md) Steps 1–8 (Cursor, Node, clone, Jack Henry, MCP, setup, `.dev.vars`, local run)  
2. [Jack Henry Getting Started](https://jackhenry.dev/open-api-docs/getting-started/)  
3. Optional deploy: [setup-cloudflare.md](./setup-cloudflare.md)  

---

## Minimal plugin skeleton

### 1. Clone / fork and install

```bash
git clone <this-repo>
cd vibing   # or your fork name
npm install
cp .dev.vars.example .dev.vars
```

Follow [setup-node.md](./setup-node.md) and [setup-cloudflare.md](./setup-cloudflare.md).

### 2. Wire OAuth (already done in this sample)

Your Worker must expose:

| Route | Purpose |
|-------|---------|
| `GET /auth/login` | Start PKCE + redirect to Banno |
| `GET /callback/plugin` | OAuth redirect URI **and** iframe entry |
| `GET /logout` | Revoke refresh token + clear session |

Banno / Jack Henry external application ([Getting Started](https://jackhenry.dev/open-api-docs/getting-started/)):

- Local: `http://localhost:8787/callback/plugin`
- Deployed: `https://<your-worker>.workers.dev/callback/plugin`
- You can configure both redirect URIs

### 3. Replace the product surface

Keep:

```ts
import { initiateAuth, handleOAuthCallback, requireSession } from './plugin'
```

Replace Pulse tabs with your own SSR pages. Example minimal authenticated page:

```tsx
// Conceptual — adapt to your routes file
router.get('/callback/plugin', async (c) => {
  // If ?code= present → handleOAuthCallback(c)
  // Else load session from signed cookie
  // Then render YOUR JSX — not DashboardView
  return c.render(<YourPluginHome userId={session.userId} />)
})
```

### 4. Call only the Consumer API scopes you need

Pulse requests a broad readonly set. For a smaller plugin, trim `SCOPES` in `src/services/auth.service.ts` (still exported via the kit’s auth helpers) to what Banno People grants your app.

### 5. Optional: drop D1

Goals use D1. If your plugin is read-only API aggregation:

- Remove `GOALS_DB` from `wrangler.jsonc`
- Remove `api.routes` / `goals.service`
- Keep KV — sessions still need it

### 6. Keep the security middleware

Do **not** strip without replacing:

- Hostname-based CORS/CSRF allowlists (`src/utils/origins.ts`)
- JWKS ID token verification
- Separate `SESSION_ENC_SECRET` and `COOKIE_SIGNING_SECRET`
- CSP `frame-ancestors` limited to your `ENV_URI`
- Fail-closed rate limits on `/auth/*`, `/callback*`, `/api/*`

See [security.md](../security.md).

---

## Checklist for a new plugin

- [ ] Node 18+ installed ([setup-node.md](./setup-node.md))
- [ ] Cloudflare account + `wrangler login` ([setup-cloudflare.md](./setup-cloudflare.md))
- [ ] KV namespace bound as `SESSIONS_KV`
- [ ] Secrets set: `CLIENT_SECRET`, `SESSION_ENC_SECRET`, `COOKIE_SIGNING_SECRET`
- [ ] `CLIENT_ID`, `ENV_URI`, `REDIRECT_URI` configured
- [ ] Banno People Primary + Redirect URIs = public HTTPS callback
- [ ] Local: `.dev.vars` (never committed)
- [ ] Local Garden test with `npm run dev` + localhost redirect URI  
- [ ] Optional: deploy or `npm run dev:banno` for a public Worker URL
- [ ] Product UI replaced; kit imports retained
- [ ] Scopes trimmed to what you actually use

---

## Suggested learning path

1. Run Pulse end-to-end once (login → tabs → logout)  
2. Read `src/plugin/index.ts` and `src/routes/auth.routes.ts`  
3. Swap one tab’s view for a hello-world page  
4. Fork and rename the Worker in `wrangler.jsonc`  

---

## Related docs

| Doc | Contents |
|-----|----------|
| [setup-node.md](./setup-node.md) | Install and verify Node.js / npm |
| [setup-cloudflare.md](./setup-cloudflare.md) | Workers, Wrangler, KV, D1, secrets, deploy |
| [architecture.md](../architecture.md) | Full system design |
| [security.md](../security.md) | Security posture |
| [src/plugin/README.md](../src/plugin/README.md) | Kit import map |
