# Docker deploy (clone → `.env` → deploy)

**Supported path:** clone from GitHub, fill `.env`, run the quickstart script.

Repo: https://github.com/alex-carlston/BannoDemo

## Windows

```powershell
git clone https://github.com/alex-carlston/BannoDemo.git
cd BannoDemo
copy .env.example .env
notepad .env
# set CLIENT_ID, CLIENT_SECRET, SESSION_ENC_SECRET, COOKIE_SIGNING_SECRET
.\quickstart.cmd
```

Docker Desktop must show **Engine running**. Confirm with `docker version` and `docker compose version`.

Secrets without OpenSSL (PowerShell):

```powershell
$b = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
[Convert]::ToBase64String($b)
```

Run twice; paste different values into `.env`.

## macOS / Linux

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
| `SESSION_ENC_SECRET` | Yes (random; see above) |
| `COOKIE_SIGNING_SECRET` | Yes (different value) |
| `REDIRECT_URI` | No on first run — set from deploy output |
| `CLOUDFLARE_API_TOKEN` | No for interactive login |

Quickstart refuses to start if required values are empty.

---

## Cloudflare login and port 8976

Interactive path uses `wrangler login` inside Docker. After you approve in the browser, Cloudflare redirects to:

```text
http://localhost:8976/oauth/callback?...
```

That must reach Wrangler in the container. Quickstart publishes the port with:

```text
docker compose run --rm --service-ports quickstart
```

**Important:** plain `docker compose run` does **not** publish `ports:` from Compose. Without `--service-ports`, Edge/Chrome shows connection refused on `:8976` and login fails.

You must answer **Y** to confirm the account from `wrangler whoami`.

### If localhost:8976 failed once

1. Ctrl+C the quickstart terminal  
2. Re-run `.\quickstart.cmd` / `./quickstart.sh` (do not reuse an old browser callback URL)  
3. Or set `CLOUDFLARE_API_TOKEN` in `.env` and re-run ([setup-cloudflare.md](./setup-cloudflare.md))

Token path (no browser): put `CLOUDFLARE_API_TOKEN` in `.env`, then `docker compose run --rm deploy`.

---

## Related

- [../README.md](../README.md)  
- [setup-banno.md](./setup-banno.md)  
- [setup-cloudflare.md](./setup-cloudflare.md)  
- [external-resources.md](./external-resources.md)  
