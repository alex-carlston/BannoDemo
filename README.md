# Banno Pulse

Banno Online Banking plugin on **Cloudflare Workers**.

**Deploy path:** clone → put credentials in `.env` → Docker deploys to Cloudflare → paste the callback into Jack Henry.

Repo: https://github.com/alex-carlston/BannoDemo

<img width="1080" height="2340" alt="Plugin in Garden (Chrome)" src="https://github.com/user-attachments/assets/d529b535-69b4-4399-9d4e-154397f191a6" />

---

## 1. Prerequisites

| Need | Link |
|------|------|
| **Docker Desktop** installed and **running** (Windows, macOS, or Linux) | https://www.docker.com/products/docker-desktop/ |
| Cloudflare account | https://dash.cloudflare.com/sign-up |
| Jack Henry Getting Started finished (test user, plugin, external app) | https://jackhenry.dev/open-api-docs/getting-started/ |
| Client ID + Client Secret from the dashboard | https://jackhenry.dev/portal/dashboard |
| An editor to edit `.env` (Cursor, VS Code, Notepad, etc.) | — |

You do **not** need Node.js on the host. Docker runs Wrangler.

Garden (sample FI): `https://digital.garden-fi.com`

### Windows (Docker Desktop)

1. Install Docker Desktop for Windows and finish setup (WSL 2 backend is the default — accept it).
2. Start **Docker Desktop** and wait until it says **Engine running**.
3. Open **PowerShell** or **Command Prompt** (or the terminal in Cursor / VS Code).
4. Confirm:

```powershell
docker version
docker compose version
```

If either fails, Docker is not installed or not running yet.

---

## 2. Clone

**Windows (PowerShell / cmd):**

```powershell
git clone https://github.com/alex-carlston/BannoDemo.git
cd BannoDemo
```

**macOS / Linux:**

```bash
git clone https://github.com/alex-carlston/BannoDemo.git
cd BannoDemo
```

Every command below runs **inside** that folder.

---

## 3. Create `.env` and fill in real values

**Windows:**

```powershell
copy .env.example .env
notepad .env
```

(Or open `.env` in Cursor / VS Code.)

**macOS / Linux:**

```bash
cp .env.example .env
```

Set these **before** you deploy:

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

### Generate the two secrets

**Windows (PowerShell)** — run twice; paste **different** values:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Or (cryptographically stronger):

```powershell
$b = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
[Convert]::ToBase64String($b)
```

**macOS / Linux:**

```bash
openssl rand -base64 32
openssl rand -base64 32
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

**Do not commit `.env`.** It is gitignored. Quickstart **exits** if required values are empty.

---

## 4. Deploy with Docker

**Windows** (from the `BannoDemo` folder):

```powershell
.\quickstart.cmd
```

**macOS / Linux:**

```bash
chmod +x ./quickstart.sh
./quickstart.sh
```

What happens:

1. Checks Docker is running  
2. Loads your `.env` values  
3. If needed, prints a Cloudflare login URL — open it in **Edge/Chrome on the host**  
4. After you approve, Cloudflare redirects to `http://localhost:8976/...` (Docker publishes that port)  
5. Asks you to **confirm** the Cloudflare account (`Y` / `n`)  
6. Deploys the Worker, applies D1 migrations, uploads secrets  
7. Prints your Jack Henry callback URL and waits  

### If `localhost:8976` fails to connect

That means the OAuth callback never reached Wrangler (common with an older `docker compose run` that did not publish ports).

1. Close the browser tab  
2. In the terminal: **Ctrl+C**  
3. Pull the latest repo (or re-clone), then run **`.\quickstart.cmd`** / **`./quickstart.sh` again** (these now pass `--service-ports`)  
4. Open the **new** login URL Wrangler prints — do not reuse an old callback URL  

**Token fallback (no browser callback):** create an API token at https://dash.cloudflare.com/profile/api-tokens with Workers + D1 + KV edit, put it in `.env` as `CLOUDFLARE_API_TOKEN=...`, leave interactive login unused, and re-run quickstart (or `docker compose run --rm deploy`).

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
5. Press Enter in the terminal  
6. Garden → test user → open the plugin  

Details: [docs/setup-banno.md](./docs/setup-banno.md)

---

## Checklist

- [ ] Docker Desktop running (`docker version` works)  
- [ ] Cloudflare account exists  
- [ ] Jack Henry Getting Started finished; Client ID / Secret in hand  
- [ ] `git clone` + `cd BannoDemo`  
- [ ] Copied `.env.example` → `.env` and filled required fields  
- [ ] `.\quickstart.cmd` (Windows) or `./quickstart.sh` completed; account confirmed  
- [ ] Redirect URI + plugin card updated in Jack Henry  
- [ ] Plugin opens in Garden (`https://digital.garden-fi.com`)  

---

## More docs

| Doc | When |
|-----|------|
| [docs/setup-docker.md](./docs/setup-docker.md) | Windows + macOS detail, OAuth port troubleshooting |
| [docs/setup-banno.md](./docs/setup-banno.md) | Garden + Jack Henry redirect / plugin card |
| [docs/setup-cloudflare.md](./docs/setup-cloudflare.md) | Token re-deploy, Workers Builds, Actions |
| [docs/setup-mcp.md](./docs/setup-mcp.md) | Optional: Cloudflare MCP in Cursor |
| [docs/external-resources.md](./docs/external-resources.md) | Attribution + external links |
| [docs/host-dev.md](./docs/host-dev.md) | Optional local Node (uses `.dev.vars`, not required) |

## Attribution

Builds on [BannoCloudflarePublic](https://github.com/alex-carlston/BannoCloudflarePublic) (MIT, Alex Carlston).

## License

MIT © 2026 Alex Carlston
