# Banno / Jack Henry setup

Use this **with** the Docker quickstart ([setup-docker.md](./setup-docker.md) · [README](../README.md)).

Official guide first — developer account, Garden test user, plugin, external application:

**[Getting Started | Banno SDK](https://jackhenry.dev/open-api-docs/getting-started/)**

Dashboard: [https://jackhenry.dev/portal/dashboard](https://jackhenry.dev/portal/dashboard)

---

## Before Docker (credentials only)

From the dashboard **External application**, copy **Client ID** and **Client Secret** into **`.env`** on your machine (`CLIENT_ID=…`, `CLIENT_SECRET=…`).

Tips if `.env` is hard to edit:

- Close Docker quickstart first (Ctrl+C). Do not edit `.env` while the container is running.
- Close and reopen `.env` in Cursor / VS Code / TextEdit, or run `open -a TextEdit .env` (macOS) / `notepad .env` (Windows).
- Leave `REDIRECT_URI=` **blank** for the first deploy. You do **not** paste the Worker callback into `.env` by hand — quickstart writes it after deploy.

Then run `./quickstart.sh` or `.\quickstart.cmd`.

---

## After deploy — finish in the Jack Henry dashboard (required)

Quickstart prints two URLs and **pauses**. Do these dashboard steps **before** you open Garden or click Sign in. If you skip them, the plugin shows:

> Authentication failed. Please try signing in again.

That message almost always means the redirect URI is missing, wrong, or **not first** in the list.

### A) External application → Redirect URI

1. Open https://jackhenry.dev/portal/dashboard  
2. Open your **External application** (the same one whose Client ID is in `.env`)  
3. Find **Redirect URI(s)**  
4. Paste the **exact** callback quickstart printed, for example:

```text
https://banno-pulse.<your-subdomain>.workers.dev/callback/plugin
```

5. **Critical (Jack Henry rule):** this Worker callback must be the **first** redirect URI in the list. Banno’s dashboard loads the **first** URI as the plugin card face. If `http://localhost:…` is first, Garden will hit localhost and auth will fail.  
6. Exact match only — no trailing slash, no `http` if the Worker is `https`, no typos.  
7. **Save**

Docs: [External applications](https://jackhenry.dev/open-api-docs/plugins/architecture/externalapplications/)

### B) Plugin configuration

1. Open / edit your **plugin**  
2. Point the plugin at your **Worker base URL** (no path), for example:

```text
https://banno-pulse.<your-subdomain>.workers.dev
```

3. Set **Initial height** to **600**  
4. **Save**

### C) Only then — try Garden

1. Press **Enter** in the quickstart terminal (if it is still waiting)  
2. Open Garden: https://digital.garden-fi.com  
3. Log in as your **test user**  
4. Open the plugin card  

Sign-in should complete and the Pulse UI should load inside the card.

---

## If auth still fails

| Check | Fix |
|-------|-----|
| Redirect URI not saved | Save in External application, retry |
| Wrong URI first in the list | Move Worker `…/callback/plugin` to **position 1** |
| Trailing slash / typo | Must match Worker `REDIRECT_URI` character-for-character |
| Different Client ID | `.env` `CLIENT_ID` must be the same external app you edited |
| Tried Garden before Save | Save dashboard, hard-refresh Garden, sign in again |
| Old localhost redirect still first | Reorder or remove until Worker callback is first |

---

## Checklist

- [ ] Getting Started finished through Confirm enrollment  
- [ ] Plugin generated  
- [ ] Client ID / Secret in `.env` (same external app)  
- [ ] After deploy: redirect URI = `https://….workers.dev/callback/plugin` and it is **first**  
- [ ] Plugin card points at Worker base URL · height **600**  
- [ ] Garden test user can open the plugin and complete sign-in  

---

## Related

- [../README.md](../README.md)  
- [setup-docker.md](./setup-docker.md)  
- [Plugin Framework](https://jackhenry.dev/open-api-docs/plugins/)  
- [setup-cloudflare.md](./setup-cloudflare.md)  
