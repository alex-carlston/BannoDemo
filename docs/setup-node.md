# Node.js setup

You only need Node on your laptop so `npm` and Wrangler work. The app itself runs on Cloudflare Workers (or locally via Wrangler).

If you follow the main [README](../README.md), Step 2 already covers this. Use this page when `node` / `npm` still fail.

---

## Requirement

- **Node.js 18.18+** (20 LTS recommended)
- **npm** (comes with Node)

Check:

```powershell
node -v
npm -v
```

---

## Install

**Windows (simplest)**

1. [https://nodejs.org](https://nodejs.org) → download **LTS** → install  
2. Close the terminal in Cursor and open a **new** one  
3. Run `node -v` again  

```powershell
# Optional:
winget install OpenJS.NodeJS.LTS
```

**Mac**

```bash
brew install node@20
# or installer from https://nodejs.org
```

---

## Project install

From the repo folder:

```powershell
npm install
```

Or let the setup script do it:

```powershell
.\scripts\setup.ps1
```

```bash
./scripts/setup.sh
```

---

## If something fails

| Symptom | Fix |
|---------|-----|
| `node` not found | Reinstall Node, then **new** terminal tab |
| `engine "node" is incompatible` | Upgrade to Node 18.18+ / 20 LTS |
| `wrangler: command not found` | Use `npx wrangler …` or `.\scripts\setup.ps1` — do not install Wrangler globally |

Next: [setup-cloudflare.md](./setup-cloudflare.md) · [setup-banno.md](./setup-banno.md) · [setup-mcp.md](./setup-mcp.md)
