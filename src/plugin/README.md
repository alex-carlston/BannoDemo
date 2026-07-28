# Plugin starter kit (`src/plugin`)

This folder marks the **reusable Banno-on-Cloudflare boundary**.

| Layer | What it is | Copy for a new plugin? |
|-------|------------|------------------------|
| **`src/plugin`** | Auth, sessions, origins, errors, OIDC/JWKS | **Yes** — this is the kit |
| Pulse product code | Dashboard tabs, goals UI, spending insights | **No** — replace with your feature |

## Import the kit

```ts
import {
  initiateAuth,
  handleOAuthCallback,
  SessionService,
  requireSession,
  isAllowedExternalOrigin,
  verifyIdToken,
} from './plugin'
```

## What the kit includes

- OAuth 2.0 + PKCE + OIDC `nonce`
- JWKS-verified ID tokens
- Encrypted KV sessions + separate cookie signing secret
- `requireSession` middleware
- CORS/CSRF hostname allowlists
- Safe client error helpers
- Localhost / Banno-iframe detection

## What stays app-specific

- `src/routes/page.routes.tsx` — your pages
- `src/components/*` — your UI
- `src/services/banno.service.ts` — which Consumer API calls you need
- `src/services/goals.service.ts` — optional product data (D1)

Full guide: [docs/plugin-starter.md](../../docs/plugin-starter.md)
