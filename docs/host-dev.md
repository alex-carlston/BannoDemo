# Host Node (optional / advanced)

**Not the supported onboarding path.** Use [setup-docker.md](./setup-docker.md) and the main [README](../README.md) for deploy.

This note is only for people who already have Node on the machine and want `wrangler` locally (for example `npm run dev`).

---

## Local develop

```bash
cp .dev.vars.example .dev.vars
# fill CLIENT_ID, CLIENT_SECRET, ENV_URI, secrets
npm install
npm run dev
```

Redirect for localhost: `http://localhost:8787/callback/plugin`  
Jack Henry allows localhost HTTP for local development. See [setup-banno.md](./setup-banno.md).

You can also say **yes** to the optional “write `.dev.vars`” prompt at the end of Docker quickstart.

---

## Host deploy (unsupported for first-time users)

If Wrangler is already authenticated on the host:

```bash
npm run deploy
```

That is what was used in early development of this repo. It is **not** documented as the primary path because it assumes Node, host `wrangler login`, and manual secret/`wrangler.jsonc` handling.

Legacy helper scripts under `scripts/setup.*` and `scripts/deploy.*` (PowerShell/bash) are **not** part of the supported journey and may be removed later. Prefer:

```bash
docker compose run --rm quickstart
# or
docker compose run --rm deploy
```

---

## Related

- [setup-docker.md](./setup-docker.md)  
- [setup-cloudflare.md](./setup-cloudflare.md)  
