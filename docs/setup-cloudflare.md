# Cloudflare setup

Commands assume you use the **Docker-supported path** ([setup-docker.md](./setup-docker.md) · [README](../README.md)).

Production is always a **Cloudflare Worker**. Docker only runs Wrangler; it does not host the plugin.

---

## 1) Account + login (interactive)

1. Sign up: [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)  
2. Run `docker compose run --rm --service-ports quickstart` (or `.\quickstart.cmd` / `./quickstart.sh`)  
3. Confirm the account at the **`wrangler whoami`** prompt  

Wrong account → answer **n** → script logs out and runs login again (OAuth URL on host browser; port **8976** must be published with `--service-ports`).

---

## 2) KV + D1 (automatic on deploy)

You do **not** create KV/D1 by hand or paste IDs into config.

`wrangler.jsonc` declares named bindings only:

- `SESSIONS_KV` — sessions / OAuth state  
- `GOALS_DB` (`database_name`: `banno-pulse-goals`) — savings goals  

On deploy (Wrangler **4.45+**), Cloudflare [auto-provisions](https://developers.cloudflare.com/workers/wrangler/configuration/#automatic-provisioning) missing resources. Quickstart also runs:

```bash
npx wrangler d1 migrations apply banno-pulse-goals --remote
```

---

## 3) Secrets

Interactive quickstart uploads from `.env` via `--secrets-file`:

- `CLIENT_SECRET`  
- `SESSION_ENC_SECRET`  
- `COOKIE_SIGNING_SECRET`  

Public values are passed as deploy `--var`s: `CLIENT_ID`, `ENV_URI`, `REDIRECT_URI`, `ENVIRONMENT`, `PLUGIN_INITIAL_HEIGHT`.

Do not bake secrets into the Docker image.

---

## 4) Deploy paths

| Path | When | Command |
|------|------|---------|
| **A. Docker quickstart** (supported) | First-time / demos | `cp .env.example .env` then `.\quickstart.cmd` / `./quickstart.sh` |
| **B. Docker CI toolbox** | Token, no browser | `CLOUDFLARE_API_TOKEN` in `.env` → `docker compose run --rm deploy` |
| **C. Workers Builds** | Auto-deploy on git push | Dashboard → Worker → Builds; deploy command `npm run deploy` |
| **D. GitHub Actions** | Alternative to C | Needs `CLOUDFLARE_API_TOKEN` (+ usually `CLOUDFLARE_ACCOUNT_ID`) |

**Do not enable both C and D** on the same branch.

### B) Token deploy

```bash
# .env:
# CLOUDFLARE_API_TOKEN=...
# CLOUDFLARE_ACCOUNT_ID=...   # recommended with multiple accounts

docker compose run --rm deploy
```

Create a token at [API Tokens](https://dash.cloudflare.com/profile/api-tokens) with Workers / D1 / KV edit.

### C) Workers Builds

1. Deploy once with quickstart so the Worker exists  
2. Dashboard → **Workers & Pages** → **banno-pulse** → **Settings** → **Builds** → **Connect**  
3. Deploy command: `npm run deploy` (includes D1 migrations)  
4. Docs: [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)

### D) GitHub Actions

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) builds the Docker image and runs `scripts/deploy-ci.sh`.

---

## 5) Optional host local

See [host-dev.md](./host-dev.md) — not onboarding.

---

## Checklist

- [ ] Docker quickstart completed with confirmed Cloudflare account  
- [ ] Secrets in Cloudflare (via quickstart)  
- [ ] Callback pasted in Jack Henry ([setup-banno.md](./setup-banno.md))  
- [ ] *(Optional)* Workers Builds connected  

---

## Common errors

| Symptom | Fix |
|---------|-----|
| Docker not running | Start Docker Desktop; `docker version` |
| `localhost:8976` connection refused after Cloudflare approve | Re-run quickstart (`--service-ports`). Do not reuse an old callback URL. Or use `CLOUDFLARE_API_TOKEN` |
| Login hangs | Open the **new** printed OAuth URL on the **host**; leave the terminal open until callback succeeds |
| Wrong Cloudflare account | Answer **n** at confirm, or clear token and re-login |
| OAuth redirect mismatch | Paste exact `…/callback/plugin` from quickstart into Jack Henry |
| Goals SQL errors | Re-run deploy so migrations apply |

Official docs: [Workers](https://developers.cloudflare.com/workers/) · [Wrangler](https://developers.cloudflare.com/workers/wrangler/) · [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) · [Automatic provisioning](https://developers.cloudflare.com/workers/wrangler/configuration/#automatic-provisioning) · [KV](https://developers.cloudflare.com/kv/) · [D1](https://developers.cloudflare.com/d1/) · [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
