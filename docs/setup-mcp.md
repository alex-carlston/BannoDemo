# Cloudflare MCP in Cursor (optional)

Not required for deploy. The supported path is Docker + `.env` ([README](../README.md)).

MCP lets Cursor call Cloudflare (docs, Workers bindings, logs, API) while you work on this repo — useful after the Worker is live.

Official server list: [Cloudflare’s MCP servers](https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/)

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
5. Choose the **same Cloudflare account** you confirmed during `./quickstart.sh`

Optional: install the Cloudflare plugin / skills from the Cursor marketplace if offered.

---

## Prove it works

Ask Cursor in chat:

- “Using Cloudflare MCP, list Workers in my account.”
- “Show recent logs for Worker `banno-pulse`.”
- “List recent Workers Builds for `banno-pulse`.” (builds MCP after you connect Git in the dashboard — see [setup-cloudflare.md](./setup-cloudflare.md))

If auth fails, re-run OAuth on the MCP servers.

---

## Related

- [../README.md](../README.md) — supported Docker deploy  
- [setup-cloudflare.md](./setup-cloudflare.md)  
