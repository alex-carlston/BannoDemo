# Banno / Jack Henry setup

Follow Jack Henry’s official guide first — it creates your developer account, Garden test user, plugin, and external application:

**[Getting Started | Banno SDK](https://jackhenry.dev/open-api-docs/getting-started/)**

Dashboard: [https://jackhenry.dev/portal/dashboard](https://jackhenry.dev/portal/dashboard)

---

## What that guide gives you

| Step on Jack Henry’s page | Result |
|---------------------------|--------|
| Sign up for a developer account | Access to the portal |
| Generate test user → Enroll in Garden → 2FA → Confirm enrollment | A Garden user you can log in as |
| Generate / configure a plugin | Plugin card shown in Garden |
| Build external application | Client ID, Client Secret, redirect URIs |

Copy **Client ID** and **Client Secret** into this project’s `.dev.vars` (see the main [README](../README.md) Step 7).

Garden base URL for this sample:

```text
https://digital.garden-fi.com
```

Set that as `ENV_URI`.

---

## Redirect URIs (localhost is OK for local work)

Jack Henry documents that **HTTPS is required for production**, and that **HTTP localhost / private addresses are allowed for local development**. See [Getting Started → Building an external application](https://jackhenry.dev/open-api-docs/getting-started/).

### Local (Cursor + `npm run dev`)

In the dashboard **Build external applications** card, set a redirect URI to:

```text
http://localhost:8787/callback/plugin
```

Match it in `.dev.vars`:

```env
REDIRECT_URI=http://localhost:8787/callback/plugin
ENVIRONMENT=development
```

Then:

```powershell
npm run dev
```

Open Garden, sign in as your test user, and open the plugin. The plugin URL / redirect should use that localhost callback while you develop.

### Deployed (Cloudflare Worker)

After `.\scripts\deploy.ps1` / `./scripts/deploy.sh`, Wrangler prints something like:

```text
https://banno-pulse.<your-subdomain>.workers.dev
```

Add this redirect URI (Primary and/or Secondary) in the Jack Henry dashboard:

```text
https://banno-pulse.<your-subdomain>.workers.dev/callback/plugin
```

And set the same value in `wrangler.jsonc` → `vars.REDIRECT_URI`, then redeploy.

You can keep **both** localhost and the Worker URL configured so local and deployed testing both work.

---

## Plugin card

In the dashboard **Plugin configuration** card (after enrollment is confirmed):

1. Generate / edit the plugin  
2. Point it at your running app URL (localhost while developing, Worker URL when deployed)  
3. Set **Initial height** to **600** (must match `PLUGIN_INITIAL_HEIGHT` in `wrangler.jsonc`)  
4. Save  

See [`banno-plugin.config.json`](../banno-plugin.config.json) for the full plugin card reference (title, description, height).

> Jack Henry recommends 200–400px for parity with other dashboard cards. We use **600px** so the tabbed dashboard fits without excessive cropping. The height is static — it cannot be changed at runtime from your app.

Exact field names follow Jack Henry’s UI; use the values from [Getting Started](https://jackhenry.dev/open-api-docs/getting-started/) and [Plugin configuration](https://jackhenry.dev/open-api-docs/plugins/overview/configuration/).

---

## Checklist

- [ ] Finished [Getting Started](https://jackhenry.dev/open-api-docs/getting-started/) through Confirm enrollment  
- [ ] Plugin generated  
- [ ] External application has `http://localhost:8787/callback/plugin` (local) and/or your `https://…workers.dev/callback/plugin` (deployed)  
- [ ] `CLIENT_ID` / `CLIENT_SECRET` / `ENV_URI` / `REDIRECT_URI` in `.dev.vars`  
- [ ] `npm run dev` works at http://localhost:8787  
- [ ] Garden test user can open the plugin and complete sign-in  

---

## Related

- [../README.md](../README.md) — full Cursor workflow  
- [setup-cloudflare.md](./setup-cloudflare.md) — deploy, KV, D1, secrets  
- [setup-mcp.md](./setup-mcp.md) — Cloudflare MCP in Cursor  
