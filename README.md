# Banno Pulse

A Banno Online Banking plugin (financial wellness hub) that runs on Cloudflare Workers.

This README is a **start-to-finish path** for someone opening the project in Cursor for the first time. Copy the commands. Do the steps in order.

<img width="1080" height="2340" alt="Screenshot_20260729_123744_Chrome" src="https://github.com/user-attachments/assets/d529b535-69b4-4399-9d4e-154397f191a6" />


Official Jack Henry setup for accounts / test user / plugin / external app:  
**[Getting Started | Banno SDK](https://jackhenry.dev/open-api-docs/getting-started/)**

---

## The path (do this in order)

| Step | What you do |
|------|-------------|
| **1** | Install Cursor + open a terminal |
| **2** | Install Node.js (one time) |
| **3** | Clone this repo and open the folder in Cursor |
| **4** | Jack Henry: developer account, test user, plugin, external app |
| **5** | Turn on Cloudflare MCP inside Cursor |
| **6** | Run the setup script (logs you into Cloudflare) |
| **7** | Put your Banno credentials in `.dev.vars` |
| **8** | Run locally (`localhost`) and test in Garden / Banno |
| **9** | Deploy to Cloudflare when you want a public URL |

Windows commands are shown first. Mac notes are under each step when they differ.

---

## 1) Install Cursor

1. Download Cursor: [https://cursor.com](https://cursor.com)
2. Install it and **sign up / sign in**
3. Open Cursor
4. Open the terminal inside Cursor: **View → Terminal** (or `` Ctrl+` `` / `` Cmd+` ``)

You will run almost every command below in that Cursor terminal.

---

## 2) Install Node.js (one time)

The setup script needs Node. Install it **once**, then reopen the terminal.

**Windows**

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download **LTS**
3. Run the installer (accept defaults)
4. Close the Cursor terminal tab and open a **new** one
5. Check:

```powershell
node -v
npm -v
```

You should see version numbers (Node **18+**, ideally **20**).

Optional shortcut if you already use winget:

```powershell
winget install OpenJS.NodeJS.LTS
```

Then open a **new** terminal and run `node -v` again.

**Mac**

```bash
# Homebrew:
brew install node@20

# Or download LTS from https://nodejs.org then open a new terminal
node -v
npm -v
```

---

## 3) Get this project into Cursor

In the Cursor terminal:

**Windows (PowerShell)**

```powershell
cd $HOME\Documents
git clone <PASTE-REPO-URL-HERE> banno-pulse
cd banno-pulse
```

**Mac**

```bash
cd ~/Documents
git clone <PASTE-REPO-URL-HERE> banno-pulse
cd banno-pulse
```

Then in Cursor: **File → Open Folder…** → select the `banno-pulse` folder.

If you already have the folder on disk, skip `git clone` and just **Open Folder**.

---

## 4) Jack Henry / Banno (Garden) setup

Do this in the browser. Follow Jack Henry’s guide end-to-end:

**[https://jackhenry.dev/open-api-docs/getting-started/](https://jackhenry.dev/open-api-docs/getting-started/)**

That page walks you through:

1. Sign up for a **developer account**
2. Create a **test user** and enroll in Garden (+ 2FA)
3. **Confirm enrollment** in the [developer dashboard](https://jackhenry.dev/portal/dashboard)
4. **Generate / configure a plugin**
5. **Build an external application** (Primary redirect URI + optional secondary)

### Values this app needs from that dashboard

| You copy from Jack Henry | Paste into |
|--------------------------|------------|
| Client ID | `.dev.vars` → `CLIENT_ID` (and later `wrangler.jsonc` `vars`) |
| Client Secret | `.dev.vars` → `CLIENT_SECRET` (and Cloudflare secret when you deploy) |
| Garden / FI base URL | `.dev.vars` → `ENV_URI` (Garden example: `https://digital.garden-fi.com`) |

### Redirect URIs (localhost is allowed for local work)

Jack Henry allows **localhost / private HTTP** redirect URIs for local development. HTTPS is required for production. See the [Getting Started](https://jackhenry.dev/open-api-docs/getting-started/) “Secure Redirect URIs” section.

For local Pulse, set the external application redirect to:

```text
http://localhost:8787/callback/plugin
```

You can keep a second redirect for your deployed Worker later, for example:

```text
https://banno-pulse.<your-subdomain>.workers.dev/callback/plugin
```

More detail: [docs/setup-banno.md](./docs/setup-banno.md)

---

## 5) Set up Cloudflare MCP in Cursor

This lets Cursor talk to your Cloudflare account (docs, bindings, logs) while you build.

1. In Cursor: **Settings → MCP**
2. Click **Add new MCP server** (or edit your MCP config)
3. Add these servers:

```json
{
  "mcpServers": {
    "cloudflare-docs": {
      "url": "https://docs.mcp.cloudflare.com/mcp"
    },
    "cloudflare-bindings": {
      "url": "https://bindings.mcp.cloudflare.com/mcp"
    },
    "cloudflare-observability": {
      "url": "https://observability.mcp.cloudflare.com/mcp"
    },
    "cloudflare-api": {
      "url": "https://mcp.cloudflare.com/mcp"
    }
  }
}
```

4. Save
5. For each server that asks to log in, complete **OAuth** and pick the **same Cloudflare account** you will deploy with
6. Optional: install the **Cloudflare** extension / skills from the Cursor marketplace if you see it

Full notes + “wrong account” fix: [docs/setup-mcp.md](./docs/setup-mcp.md)

---

## 6) Run setup (install deps + Cloudflare login)

From the project folder in the Cursor terminal:

**Windows**

```powershell
.\scripts\setup.ps1
```

If PowerShell complains about scripts:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

Or:

```bat
scripts\setup.cmd
```

**Mac**

```bash
./scripts/setup.sh
```

What this does:

1. Confirms `node` / `npm` work (if not, it tells you to finish Step 2)
2. Runs `npm install`
3. Runs `npx wrangler whoami` — if you are not logged in, it runs `npx wrangler login` (browser opens)
4. Creates `.dev.vars` from the example if it does not exist yet

### Wrong Cloudflare account?

```powershell
# Windows
.\scripts\setup.ps1 -RefreshAuth
```

```bash
# Mac
./scripts/setup.sh --refresh-auth
```

That logs Wrangler out and logs you back in. Then check:

```powershell
npx wrangler whoami
```

Always use `npx wrangler …` (or the scripts). A bare `wrangler` command often fails with `command not found`.

---

## 7) Fill in `.dev.vars`

Open `.dev.vars` in Cursor and set:

```env
CLIENT_ID=...from Jack Henry dashboard...
CLIENT_SECRET=...from Jack Henry dashboard...
ENV_URI=https://digital.garden-fi.com
REDIRECT_URI=http://localhost:8787/callback/plugin
SESSION_ENC_SECRET=...random...
COOKIE_SIGNING_SECRET=...different-random...
ENVIRONMENT=development
```

Generate the two secrets:

**Windows (PowerShell)** — run twice; paste different values:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

**Mac**

```bash
openssl rand -base64 32
openssl rand -base64 32
```

Never commit `.dev.vars`.

---

## 8) Run locally (works with Banno localhost)

```powershell
npm run dev
```

Open [http://localhost:8787](http://localhost:8787).

Point your Jack Henry **external application** redirect URI at:

`http://localhost:8787/callback/plugin`

Then open Garden / Banno with your test user and launch the plugin. Localhost is a supported local-development path per Jack Henry’s docs.

---

## 9) Deploy to Cloudflare (public URL)

### One-time Cloudflare resources (your account)

```powershell
npx wrangler login
npx wrangler whoami

npx wrangler kv namespace create SESSIONS_KV
npx wrangler d1 create banno-pulse-goals
npx wrangler d1 migrations apply banno-pulse-goals --remote
```

Paste the returned **KV id** and **D1 database_id** into `wrangler.jsonc`.

Set production secrets (paste when prompted):

```powershell
npx wrangler secret put CLIENT_SECRET
npx wrangler secret put SESSION_ENC_SECRET
npx wrangler secret put COOKIE_SIGNING_SECRET
```

Put public config in `wrangler.jsonc` `vars`: `CLIENT_ID`, `ENV_URI`, and a public callback, for example:

`https://banno-pulse.<your-subdomain>.workers.dev/callback/plugin`

### Deploy

**Windows**

```powershell
.\scripts\deploy.ps1
```

**Mac**

```bash
./scripts/deploy.sh
```

Or:

```powershell
npm run deploy
```

Copy the `https://….workers.dev` URL from the output. Add that same `…/callback/plugin` URL as a redirect URI in the Jack Henry dashboard (you can keep localhost as another URI for local work).

More Cloudflare detail: [docs/setup-cloudflare.md](./docs/setup-cloudflare.md)

---

## Command cheat sheet

| Goal | Windows | Mac |
|------|---------|-----|
| First-time setup | `.\scripts\setup.ps1` | `./scripts/setup.sh` |
| Re-login to Cloudflare | `.\scripts\setup.ps1 -RefreshAuth` | `./scripts/setup.sh --refresh-auth` |
| Who am I on Cloudflare? | `npx wrangler whoami` | same |
| Local app | `npm run dev` | same |
| Deploy | `.\scripts\deploy.ps1` | `./scripts/deploy.sh` |
| Deploy (no prompts) | `npm run deploy` | same |
| Live remote dev URL | `npm run dev:banno` | same |

---

## What this app includes

| Area | What you get |
|------|----------------|
| Overview / Accounts / Activity | Balances, history, categorization |
| Insights / Goals / Documents | Spending insights, D1 goals, statements |
| Auth kit | `src/plugin` — OAuth/PKCE, sessions, CSRF helpers |

Build your own UI on the kit: [docs/plugin-starter.md](./docs/plugin-starter.md)

---

## More docs

| Doc | When you need it |
|-----|------------------|
| [Jack Henry Getting Started](https://jackhenry.dev/open-api-docs/getting-started/) | Developer account, test user, plugin, external app |
| [docs/setup-banno.md](./docs/setup-banno.md) | Redirect URIs + wiring Pulse to Garden |
| [docs/setup-mcp.md](./docs/setup-mcp.md) | Cloudflare MCP in Cursor |
| [docs/setup-cloudflare.md](./docs/setup-cloudflare.md) | KV, D1, secrets, deploy |
| [docs/setup-node.md](./docs/setup-node.md) | Node install troubleshooting |
| [architecture.md](./architecture.md) | How the system fits together |
| [security.md](./security.md) | Auth / session posture |

## License

MIT
