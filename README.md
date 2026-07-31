# Banno Pulse

Banno Online Banking plugin on **Cloudflare Workers**.

**Deploy path:** clone → put credentials in `.env` → Docker deploys to Cloudflare → paste the callback into Jack Henry.

Repo: https://github.com/alex-carlston/BannoDemo

<img width="1080" height="2340" alt="Plugin in Garden (Chrome)" src="https://github.com/user-attachments/assets/d529b535-69b4-4399-9d4e-154397f191a6" />

---

## 1. Prerequisites

| Need | Link |
|------|------|
| **Docker Desktop** installed and **running** | https://www.docker.com/products/docker-desktop/ |
| Cloudflare account | https://dash.cloudflare.com/sign-up |
| Jack Henry Getting Started finished (test user, plugin, external app) | https://jackhenry.dev/open-api-docs/getting-started/ |
| Client ID + Client Secret from the dashboard | https://jackhenry.dev/portal/dashboard |
| An editor to edit `.env` (Cursor, VS Code, or any text editor) | — |

You do **not** need Node.js on the host for the supported path. Docker runs Wrangler.

Garden (sample FI) base URL used by this demo: `https://digital.garden-fi.com`

---

## 2. Clone

```bash
git clone https://github.com/alex-carlston/BannoDemo.git
cd BannoDemo
```

Every command below runs **inside** that folder.

---

## 3. Create `.env` and fill in real values

```bash
cp .env.example .env
```

Open **`.env`** in your editor. Set these **before** you deploy:

| Variable | What to put |
|----------|-------------|
| `CLIENT_ID` | From Jack Henry → external application |
| `CLIENT_SECRET` | From Jack Henry → external application |
| `ENV_URI` | Garden base URL (default is fine: `https://digital.garden-fi.com`) |
| `SESSION_ENC_SECRET` | Random secret (generate below) |
| `COOKIE_SIGNING_SECRET` | **Different** random secret (generate below) |

Leave blank for now:

- `CLOUDFLARE_API_TOKEN` — empty = interactive `wrangler login` inside Docker
- `CLOUDFLARE_ACCOUNT_ID` — optional
- `REDIRECT_URI` — empty on first deploy; quickstart writes your `…/callback/plugin` URL

Generate the two secrets (run twice; paste **different** values):

```bash
openssl rand -base64 32
openssl rand -base64 32
```

Example of a correctly filled block:

```env
CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_SECRET=your-secret-from-jack-henry
ENV_URI=https://digital.garden-fi.com
REDIRECT_URI=
SESSION_ENC_SECRET=paste-first-openssl-value
COOKIE_SIGNING_SECRET=paste-second-openssl-value
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
```

**Do not commit `.env`.** It is gitignored.

`./quickstart.sh` **exits** if required values are empty.

---

## 4. Deploy with Docker

```bash
chmod +x ./quickstart.sh
./quickstart.sh
```

Windows:

```bat
quickstart.cmd
```

What happens:

1. Checks Docker is running  
2. Loads your `.env` values  
3. Runs `wrangler whoami` — if needed, prints a login URL (open it in your browser; port **8976**)  
4. Asks you to **confirm** the Cloudflare account (`Y` / `n`)  
5. Deploys the Worker, applies D1 migrations, uploads secrets from `.env`  
6. Prints your callback URL and waits  

---

## 5. Paste the callback into Jack Henry

The script prints something like:

```text
https://banno-pulse.<your-subdomain>.workers.dev/callback/plugin
```

1. Open https://jackhenry.dev/portal/dashboard  
2. External application → **redirect URI** = that exact URL  
3. Plugin configuration → plugin URL = `https://banno-pulse.<your-subdomain>.workers.dev` · **Initial height = 600**  
4. Save  
5. Press Enter in the terminal (script usually already wrote `REDIRECT_URI` into `.env`)  
6. Garden → log in as your test user → open the plugin  

Details: [docs/setup-banno.md](./docs/setup-banno.md)

---

## Checklist

- [ ] Docker Desktop running  
- [ ] Cloudflare account exists  
- [ ] Jack Henry Getting Started finished; Client ID / Secret in hand  
- [ ] `git clone` + `cd BannoDemo`  
- [ ] `cp .env.example .env` and filled `CLIENT_ID`, `CLIENT_SECRET`, `ENV_URI`, both secrets  
- [ ] `./quickstart.sh` completed; Cloudflare account confirmed  
- [ ] Redirect URI + plugin card updated in Jack Henry  
- [ ] Plugin opens in Garden (`https://digital.garden-fi.com`)  

---

## More docs

| Doc | When |
|-----|------|
| [docs/setup-docker.md](./docs/setup-docker.md) | Same path, more detail |
| [docs/setup-banno.md](./docs/setup-banno.md) | Garden + Jack Henry redirect / plugin card |
| [docs/setup-cloudflare.md](./docs/setup-cloudflare.md) | Token re-deploy, Workers Builds, Actions |
| [docs/setup-mcp.md](./docs/setup-mcp.md) | Optional: Cloudflare MCP in Cursor |
| [docs/external-resources.md](./docs/external-resources.md) | Attribution + external links |
| [docs/host-dev.md](./docs/host-dev.md) | Optional local Node (uses `.dev.vars`, not required) |

## Attribution

Builds on [BannoCloudflarePublic](https://github.com/alex-carlston/BannoCloudflarePublic) (MIT, Alex Carlston).

## License

MIT © 2026 Alex Carlston
