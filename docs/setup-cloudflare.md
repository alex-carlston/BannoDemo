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

## 3) KV + D1 (automatic on deploy)

You do **not** create KV/D1 by hand or paste IDs into config.

`wrangler.jsonc` declares named bindings only:

- `SESSIONS_KV` — sessions / OAuth state
- `GOALS_DB` (`database_name`: `banno-pulse-goals`) — savings goals

On `wrangler deploy` (Wrangler **4.45+**), Cloudflare [auto-provisions](https://developers.cloudflare.com/workers/wrangler/configuration/#automatic-provisioning) missing KV and D1 resources and links them to the Worker. Wrangler may write resource IDs back into `wrangler.jsonc` after the first deploy; that is optional bookkeeping, not a setup step.

`npm run deploy` (and the deploy scripts) also run:

```powershell
npx wrangler d1 migrations apply banno-pulse-goals --remote
```

so the Goals schema is applied after the database exists.

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

## 5) Deploy (pick a path)

Production is always a **Cloudflare Worker**. Nothing in this repo runs the app inside Docker in production.

| Path | When to use | GitHub required? |
|------|-------------|------------------|
| **A. Local scripts** | Day-to-day / first deploy from your machine | No |
| **B. Local Docker toolbox** | Same deploy, but Node/Wrangler come from a container on your machine | No |
| **C. Workers Builds** (Cloudflare watches the repo) | Auto-deploy on every push — Cloudflare’s built-in Git integration | Yes (repo connected in the Cloudflare dashboard) |
| **D. GitHub Actions** (optional alternative) | Auto-deploy from GitHub’s runners instead of Workers Builds | Yes |

**Do not enable both C and D** on the same branch, or every push will deploy twice.

### A) Local scripts (default)

```powershell
.\scripts\deploy.ps1
# or
npm run deploy
```

```bash
./scripts/deploy.sh
# or
npm run deploy
```

Copy the `https://….workers.dev` URL. Add  
`https://….workers.dev/callback/plugin`  
as a Jack Henry redirect URI ([setup-banno.md](./setup-banno.md)), set `vars.REDIRECT_URI` to the same, redeploy.

### B) Local Docker toolbox (optional)

Docker here is only a **Node 20 + Wrangler box** on your computer. It still deploys *to* Cloudflare; it does not host the Worker.

You need a Cloudflare API token (not interactive `wrangler login`):

```bash
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=...   # recommended if the token can see more than one account

docker compose run --rm deploy
# or: npm run deploy:ci
```

Create a token at [API Tokens](https://dash.cloudflare.com/profile/api-tokens) with Workers / D1 / KV edit on this account. Worker runtime secrets (`CLIENT_SECRET`, etc.) stay in Cloudflare via `wrangler secret put` — do not bake them into the image.

### C) Workers Builds — Cloudflare watches GitHub (recommended auto-deploy)

This is the Cloudflare-native path: connect the Worker to your GitHub (or GitLab) repo in the dashboard. On each push to the production branch, Cloudflare builds and deploys. You do **not** need Docker or GitHub Actions for this.

Official docs: [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) · [GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/) · [Build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)

1. Deploy once locally (path A) so the Worker `banno-pulse` exists and secrets/bindings are in place.
2. Dashboard → **Workers & Pages** → **banno-pulse** → **Settings** → **Builds** → **Connect**.
3. Authorize GitHub/GitLab and select this repository + production branch (usually `main`).
4. Set **Deploy command** to:

   ```text
   npm run deploy
   ```

   That runs `wrangler deploy` **and** D1 migrations (`banno-pulse-goals`). The default `npx wrangler deploy` alone skips migrations.
5. Leave **Build command** empty unless you add a separate build step later.
6. Confirm the Worker **name** in the dashboard matches `"name": "banno-pulse"` in [`wrangler.jsonc`](../wrangler.jsonc).
7. Push a commit to the connected branch — Cloudflare runs the build/deploy. You can also use the [cloudflare-builds MCP](./setup-mcp.md) in Cursor to inspect builds.

Cloudflare can auto-create an API token for Builds; you usually do not put tokens in GitHub secrets for this path.

### D) GitHub Actions (optional — only if you are *not* using Workers Builds)

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) builds the Docker toolbox image and runs `scripts/deploy-ci.sh` on **push to `main`** or **workflow_dispatch**.

GitHub → **Settings** → **Secrets and variables** → **Actions**:

| Secret | Required | Purpose |
|--------|----------|---------|
| `CLOUDFLARE_API_TOKEN` | Yes | Wrangler auth |
| `CLOUDFLARE_ACCOUNT_ID` | Recommended | Pins the account |

Prefer **path C** when you want Cloudflare to own CI/CD. Use **D** only if you explicitly want deploy logic in GitHub instead.

---

## 6) Dev modes

| Command | Use |
|---------|-----|
| `npm run dev` | Local `http://localhost:8787` — use with Jack Henry localhost redirect |
| `npm run dev:banno` | Temporary public `*.workers.dev` URL via `wrangler dev --remote` |
| `npm run deploy` | Stable production Worker (+ D1 migrations) |

---

## 7) Types (optional)

```powershell
npm run cf-typegen
```

---

## Checklist

- [ ] `npx wrangler whoami` shows the right account  
- [ ] Secrets set  
- [ ] Deployed once (`npm run deploy` / deploy script)  
- [ ] Deployed URL added in Jack Henry dashboard  
- [ ] *(Optional)* Workers Builds connected; deploy command = `npm run deploy`  
- [ ] Cloudflare MCP connected in Cursor ([setup-mcp.md](./setup-mcp.md))  

---

## Common errors

| Symptom | Fix |
|---------|-----|
| `wrangler: command not found` | Use `npx wrangler …` or `.\scripts\*.ps1` |
| Auth error / wrong account | `-RefreshAuth` / `--refresh-auth`, then `whoami` |
| Binding missing at runtime | Redeploy so Wrangler can provision; confirm with `kv namespace list` / `d1 list` |
| Secret undefined | `wrangler secret put …` then redeploy |
| Goals SQL errors | Ensure deploy finished migrations (`d1 migrations apply banno-pulse-goals --remote`) |

Official docs: [Workers](https://developers.cloudflare.com/workers/) · [Wrangler](https://developers.cloudflare.com/workers/wrangler/) · [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) · [Automatic provisioning](https://developers.cloudflare.com/workers/wrangler/configuration/#automatic-provisioning) · [KV](https://developers.cloudflare.com/kv/) · [D1](https://developers.cloudflare.com/d1/) · [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
