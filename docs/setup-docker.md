# Docker deploy (clone → `.env` → deploy)

**Supported path:** clone from GitHub, fill `.env`, run `./quickstart.sh`.

Repo: https://github.com/alex-carlston/BannoDemo

```bash
git clone https://github.com/alex-carlston/BannoDemo.git
cd BannoDemo
cp .env.example .env
# edit .env — CLIENT_ID, CLIENT_SECRET, SESSION_ENC_SECRET, COOKIE_SIGNING_SECRET
./quickstart.sh
```

Then paste the printed `…/callback/plugin` into Jack Henry ([setup-banno.md](./setup-banno.md)).

Full steps: [../README.md](../README.md)

---

## Required `.env` values

| Variable | Required before deploy? |
|----------|-------------------------|
| `CLIENT_ID` | Yes |
| `CLIENT_SECRET` | Yes |
| `ENV_URI` | Yes (default Garden URL is fine) |
| `SESSION_ENC_SECRET` | Yes (`openssl rand -base64 32`) |
| `COOKIE_SIGNING_SECRET` | Yes (different value) |
| `REDIRECT_URI` | No on first run — set from deploy output |
| `CLOUDFLARE_API_TOKEN` | No for interactive login |

`./quickstart.sh` refuses to start if required values are empty.

---

## Cloudflare confirm

Interactive path uses `wrangler login` (browser URL, port **8976** mapped). You must answer **Y** to confirm the account from `wrangler whoami`.

Token path: put `CLOUDFLARE_API_TOKEN` in `.env`, then `docker compose run --rm deploy` ([setup-cloudflare.md](./setup-cloudflare.md)).

---

## Related

- [../README.md](../README.md)  
- [setup-banno.md](./setup-banno.md)  
- [setup-cloudflare.md](./setup-cloudflare.md)  
- [external-resources.md](./external-resources.md)  
