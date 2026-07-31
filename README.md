# Banno Pulse

Banno Online Banking plugin on **Cloudflare Workers**.

**Deploy path:** clone → put credentials in `.env` → Docker deploys to Cloudflare → paste the callback into Jack Henry → open Garden.

Repo: https://github.com/alex-carlston/BannoDemo

<img width="1080" height="2340" alt="Plugin in Garden (Chrome)" src="https://github.com/user-attachments/assets/d529b535-69b4-4399-9d4e-154397f191a6" />

---

## 1. Prerequisites

| Need | Link |
|------|------|
| **Docker Desktop** installed and **running** | https://www.docker.com/products/docker-desktop/ |
| Cloudflare account | https://dash.cloudflare.com/sign-up |
| Jack Henry Getting Started finished (test user, plugin, external app) | https://jackhenry.dev/open-api-docs/getting-started/ |
| Client ID + Client Secret | https://jackhenry.dev/portal/dashboard |
| An editor for `.env` (Cursor, VS Code, Notepad, TextEdit, etc.) | — |

You do **not** need Node.js on the host. Docker runs Wrangler.

Garden (sample FI): https://digital.garden-fi.com

**Windows:** Install Docker Desktop (WSL 2 is fine), start it until **Engine running**, then confirm in PowerShell:

```powershell
docker version
docker compose version
```

---

## 2. Clone

```bash
git clone https://github.com/alex-carlston/BannoDemo.git
cd BannoDemo
```

(Windows PowerShell: same commands.)

---

## 3. Create `.env` and fill in real values

```bash
# macOS / Linux
cp .env.example .env

# Windows
copy .env.example .env
```

Open `.env` and set these **before** deploy:

| Variable | What to put |
|----------|-------------|
| `CLIENT_ID` | Jack Henry → external application |
| `CLIENT_SECRET` | Jack Henry → external application |
| `ENV_URI` | Leave default: `https://digital.garden-fi.com` |
| `SESSION_ENC_SECRET` | Random (generate below) |
| `COOKIE_SIGNING_SECRET` | **Different** random value |

Leave blank:

| Variable | Why |
|----------|-----|
| `REDIRECT_URI` | Quickstart fills the full `…/callback/plugin` URL after deploy |
| `CLOUDFLARE_API_TOKEN` | Empty = interactive Cloudflare login in Docker |
| `CLOUDFLARE_ACCOUNT_ID` | Optional |

Generate secrets (run twice; paste two different values):

```bash
# macOS / Linux
openssl rand -base64 32

# Windows PowerShell
$b = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
[Convert]::ToBase64String($b)
```

Example:

```env
CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_SECRET=your-secret-from-jack-henry
ENV_URI=https://digital.garden-fi.com
REDIRECT_URI=
SESSION_ENC_SECRET=paste-first-random-value
COOKIE_SIGNING_SECRET=paste-second-random-value
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
```

**Do not** put only the Worker base host in `REDIRECT_URI` (that breaks login). Leave it empty and let quickstart set the full callback.

**Do not commit `.env`.** Quickstart exits if required values are empty.

If Cursor will not paste into `.env` on Mac: `open -e .env`, edit in TextEdit, save.

---

## 4. Deploy with Docker

```bash
# macOS / Linux
./quickstart.sh

# Windows
.\quickstart.cmd
```

What happens:

1. Checks Docker is running  
2. Loads `.env`  
3. Cloudflare login if needed (open the printed URL in your browser; callback uses host port **8976**)  
4. Confirm the Cloudflare account (`Y` / `n`)  
5. Deploys the Worker, D1 migrations, and secrets  
6. Sets `REDIRECT_URI` to `https://banno-pulse.<your-subdomain>.workers.dev/callback/plugin`  
7. Prints that callback and waits for you to update Jack Henry  

If `localhost:8976` fails after Cloudflare approve: Ctrl+C, re-run quickstart (it publishes the port). Or set `CLOUDFLARE_API_TOKEN` in `.env` and re-run (no browser login).

---

## 5. Finish in Jack Henry, then open Garden

Quickstart prints (and writes `callback-url.txt`):

```text
https://banno-pulse.<your-subdomain>.workers.dev/callback/plugin
```

Paste that into **Jack Henry**, not into `.env`.

| Dashboard field | Exact value |
|-----------------|-------------|
| **External application → Redirect URI** (must be **first** in the list) | `https://banno-pulse.<your-subdomain>.workers.dev/callback/plugin` |
| **Plugin configuration → Plugin URL** | `https://banno-pulse.<your-subdomain>.workers.dev` (base host, no path) |
| **Initial height** | `600` |

Steps:

1. https://jackhenry.dev/portal/dashboard  
2. Same external app as your `CLIENT_ID` → set Redirect URI → **Save**  
3. Plugin → Plugin URL + height **600** → **Save**  
4. Press Enter in the quickstart terminal  
5. Garden → test user → open the plugin: https://digital.garden-fi.com  

Optional check: `https://banno-pulse.<your-subdomain>.workers.dev/__setup` should show `"ok": true`.

If you see **Authentication failed. Please try signing in again.**, the Redirect URI is wrong, missing `/callback/plugin`, or not first in the list — details in [docs/setup-banno.md](./docs/setup-banno.md).

---

## Checklist

- [ ] Docker Desktop running (`docker version` works)  
- [ ] Cloudflare account exists  
- [ ] Jack Henry Getting Started finished; Client ID / Secret in hand  
- [ ] `git clone` + `cd BannoDemo`  
- [ ] `.env` filled (`REDIRECT_URI` left blank)  
- [ ] `./quickstart.sh` or `.\quickstart.cmd` completed  
- [ ] Jack Henry Redirect URI = full `…/callback/plugin` (first) + plugin height 600  
- [ ] Plugin opens in Garden  

---

## More docs

| Doc | When |
|-----|------|
| [docs/setup-docker.md](./docs/setup-docker.md) | Extra Docker / port 8976 detail |
| [docs/setup-banno.md](./docs/setup-banno.md) | Garden + Jack Henry redirect / plugin card |
| [docs/setup-cloudflare.md](./docs/setup-cloudflare.md) | Token re-deploy, Workers Builds, optional Actions |
| [docs/setup-mcp.md](./docs/setup-mcp.md) | Optional Cloudflare MCP in Cursor |
| [docs/external-resources.md](./docs/external-resources.md) | Attribution + external links |
| [docs/host-dev.md](./docs/host-dev.md) | Optional local Node (`.dev.vars`) |

## Attribution

Builds on [BannoCloudflarePublic](https://github.com/alex-carlston/BannoCloudflarePublic) (MIT, Alex Carlston).

## License

MIT © 2026 Alex Carlston
