# Cloudflare setup

Commands assume you already opened this repo in Cursor and can run `node` / `npm` ([README](../README.md) Steps 1–3).

Prefer the scripts:

```powershell
# Windows
.\scripts\setup.ps1
.\scripts\deploy.ps1

# Wrong Cloudflare account:
.\scripts\setup.ps1 -RefreshAuth
```

```bash
# Mac
./scripts/setup.sh
./scripts/deploy.sh
./scripts/setup.sh --refresh-auth
```

Always call Wrangler via `npx wrangler …` (or those scripts). Do not rely on a global `wrangler` binary.

---

## 1) Cloudflare account

1. Sign up: [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Verify email
3. Free Workers tier is enough for Garden testing

---

## 2) Log in (and re-check the account)

```powershell
npx wrangler login
npx wrangler whoami
```

`whoami` must show the account that should own `banno-pulse`.

| Problem | Fix |
|---------|-----|
| Wrong account | `npx wrangler logout` then `npx wrangler login`, or `.\scripts\setup.ps1 -RefreshAuth` |
| Pin this repo to one account | add `"account_id": "…"` from `whoami` into `wrangler.jsonc` |
| Many accounts | [Wrangler auth profiles](https://developers.cloudflare.com/workers/wrangler/profiles/) |

---

## 3) Create KV + D1 (one time per account)

```powershell
npx wrangler kv namespace create SESSIONS_KV
npx wrangler d1 create banno-pulse-goals
```

Paste the IDs into `wrangler.jsonc`:

- `kv_namespaces[0].id`
- `d1_databases[0].database_id`

Apply migrations:

```powershell
npx wrangler d1 migrations apply banno-pulse-goals --remote
npx wrangler d1 migrations apply banno-pulse-goals --local
```

---

## 4) Secrets (production Worker)

```powershell
npx wrangler secret put CLIENT_SECRET
npx wrangler secret put SESSION_ENC_SECRET
npx wrangler secret put COOKIE_SIGNING_SECRET
```

Public values stay in `wrangler.jsonc` `vars`: `CLIENT_ID`, `ENV_URI`, `REDIRECT_URI`, `ENVIRONMENT`.

Local-only values stay in `.dev.vars` (never commit).

---

## 5) Deploy

```powershell
.\scripts\deploy.ps1
# or
npm run deploy
```

Copy the `https://….workers.dev` URL. Add  
`https://….workers.dev/callback/plugin`  
as a Jack Henry redirect URI ([setup-banno.md](./setup-banno.md)), set `vars.REDIRECT_URI` to the same, redeploy.

---

## 6) Dev modes

| Command | Use |
|---------|-----|
| `npm run dev` | Local `http://localhost:8787` — use with Jack Henry localhost redirect |
| `npm run dev:banno` | Temporary public `*.workers.dev` URL via `wrangler dev --remote` |
| `npm run deploy` | Stable production Worker |

---

## 7) Types (optional)

```powershell
npm run cf-typegen
```

---

## Checklist

- [ ] `npx wrangler whoami` shows the right account  
- [ ] KV + D1 IDs in `wrangler.jsonc`  
- [ ] Secrets set  
- [ ] Deployed URL added in Jack Henry dashboard  
- [ ] Cloudflare MCP connected in Cursor ([setup-mcp.md](./setup-mcp.md))  

---

## Common errors

| Symptom | Fix |
|---------|-----|
| `wrangler: command not found` | Use `npx wrangler …` or `.\scripts\*.ps1` |
| Auth error / wrong account | `-RefreshAuth` / `--refresh-auth`, then `whoami` |
| Binding missing at runtime | IDs must exist **on that account** (`kv namespace list`, `d1 list`) |
| Secret undefined | `wrangler secret put …` then redeploy |

Official docs: [Workers](https://developers.cloudflare.com/workers/) · [Wrangler](https://developers.cloudflare.com/workers/wrangler/) · [KV](https://developers.cloudflare.com/kv/) · [D1](https://developers.cloudflare.com/d1/) · [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
