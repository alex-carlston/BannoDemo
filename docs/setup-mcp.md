# Cloudflare MCP in Cursor

MCP lets Cursor call Cloudflare (docs, Workers bindings, logs, API) while you work on this repo.

Do this **after** Cursor is installed and this folder is open ([README](../README.md) Steps 1–3).

Official server list: [Cloudflare’s own MCP servers](https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/)

---

## Add the servers

1. Cursor → **Settings** → **MCP**
2. Add / edit MCP config and paste:

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
    "cloudflare-builds": {
      "url": "https://builds.mcp.cloudflare.com/mcp"
    },
    "cloudflare-api": {
      "url": "https://mcp.cloudflare.com/mcp"
    }
  }
}
```

3. Save  
4. Click **Connect** / approve **OAuth** for each server that asks  
5. Choose the **same Cloudflare account** you use with Wrangler  

Optional: install the Cloudflare plugin / skills from the Cursor marketplace if offered.

---

## Match Wrangler to the same account

In the Cursor terminal:

```powershell
npx wrangler whoami
```

If that is the wrong account:

```powershell
# Windows
.\scripts\setup.ps1 -RefreshAuth
```

```bash
# Mac
./scripts/setup.sh --refresh-auth
```

Then disconnect + reconnect the MCP servers in Cursor Settings → MCP and OAuth again with the correct account.

---

## Prove it works

Ask Cursor in chat:

- “Using Cloudflare MCP, list Workers in my account.”
- “Show recent logs for Worker `banno-pulse`.”

If auth fails, re-run OAuth on the MCP servers and `npx wrangler whoami` again.

---

## Related

- [../README.md](../README.md) Step 5  
- [setup-cloudflare.md](./setup-cloudflare.md)  
