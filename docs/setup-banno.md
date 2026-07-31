# Banno / Jack Henry setup

Use this **with** the Docker quickstart ([setup-docker.md](./setup-docker.md) · [README](../README.md)).

Official guide first — developer account, Garden test user, plugin, external application:

**[Getting Started | Banno SDK](https://jackhenry.dev/open-api-docs/getting-started/)**

Dashboard: [https://jackhenry.dev/portal/dashboard](https://jackhenry.dev/portal/dashboard)  
Plugin Framework: [https://jackhenry.dev/open-api-docs/plugins/](https://jackhenry.dev/open-api-docs/plugins/)

---

## What Getting Started gives you

| Step on Jack Henry’s page | Result |
|---------------------------|--------|
| Sign up for a developer account | Access to the portal |
| Generate test user → Enroll in Garden → 2FA → Confirm enrollment | A Garden user you can log in as |
| Generate / configure a plugin | Plugin card shown in Garden |
| Build external application | **Client ID**, **Client Secret**, redirect URI fields |

Put **Client ID** and **Client Secret** in **`.env`** before `./quickstart.sh` (see [README](../README.md)). The script only prompts if those fields are still blank.

Garden (sample FI) — enroll your test user here and open the plugin after deploy:

```text
https://digital.garden-fi.com
```

That URL is `ENV_URI` in `.env` (already the default in `.env.example`).

---

## After deploy — paste the callback (required)

The quickstart prints a Worker URL and pauses. In the dashboard:

### External application — redirect URI

Exact value from quickstart (example shape):

```text
https://banno-pulse.<your-subdomain>.workers.dev/callback/plugin
```

Jack Henry requires **HTTPS** for production redirects. The Worker URL is HTTPS.

### Plugin card

1. Generate / edit the plugin  
2. Point it at your **Worker base URL** (the `https://….workers.dev` host the quickstart printed)  
3. Set **Initial height** to **600** (matches `PLUGIN_INITIAL_HEIGHT`)  
4. Save  

See [`banno-plugin.config.json`](../banno-plugin.config.json) for title/description/height reference.

> Jack Henry recommends 200–400px for parity with other cards. We use **600px** so the tabbed dashboard fits. Height is static.

---

## Optional localhost only

If you later use host `npm run dev` ([host-dev.md](./host-dev.md)), Jack Henry allows HTTP localhost for local development. You may add a **second** redirect:

```text
http://localhost:8787/callback/plugin
```

That is **not** required for the Docker deploy path.

---

## Checklist

- [ ] Finished [Getting Started](https://jackhenry.dev/open-api-docs/getting-started/) through Confirm enrollment  
- [ ] Plugin generated  
- [ ] External application has Client ID / Secret (pasted into Docker quickstart → `.env`)  
- [ ] After deploy: redirect URI = `https://….workers.dev/callback/plugin`  
- [ ] Plugin card points at Worker · height **600**  
- [ ] Garden test user can open the plugin and complete sign-in  

---

## Related

- [../README.md](../README.md) — supported Docker journey  
- [setup-docker.md](./setup-docker.md) — login, keys, deploy, pause for callback  
- [Plugin Framework](https://jackhenry.dev/open-api-docs/plugins/)  
- [external-resources.md](./external-resources.md)  
- [setup-cloudflare.md](./setup-cloudflare.md)  
- [setup-mcp.md](./setup-mcp.md)  
