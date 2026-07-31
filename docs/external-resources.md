# External resources

Useful reading outside this repo — in the same spirit as Jack Henry’s [Authentication Framework → External Resources](https://jackhenry.dev/authentication-framework/concepts/external-resources/).

This page points at **Plugin Framework** docs, related sample projects, and Cloudflare posts that inform how Banno Pulse is built and where it can grow next.

---

## Jack Henry / Banno Plugin Framework

Start here when you are building or reviewing a Banno iframe plugin:

| Resource | Why it matters |
|----------|----------------|
| [Plugin Framework](https://jackhenry.dev/open-api-docs/plugins/) | Hub for plugins: overview, quickstarts, guides, tutorials, architecture |
| [Getting Started](https://jackhenry.dev/open-api-docs/getting-started/) | Developer account, Garden test user, plugin card, external app |
| [Plugin configuration](https://jackhenry.dev/open-api-docs/plugins/overview/configuration/) | Plugin card fields (URL, height, etc.) |
| [Authentication Framework → External Resources](https://jackhenry.dev/authentication-framework/concepts/external-resources/) | OAuth / OIDC / JWT / PKCE primers Jack Henry already curates |

Pulse-specific wiring for Garden redirects and credentials: [setup-banno.md](./setup-banno.md).

---

## Related projects & attribution

| Project | Role |
|---------|------|
| [BannoCloudflarePublic](https://github.com/alex-carlston/BannoCloudflarePublic) | Earlier public sample: Hono + Banno OAuth/PKCE on Cloudflare Workers (KV sessions, plugin callback). **Banno Pulse builds on that lineage.** Authored by [Alex Carlston](https://github.com/alex-carlston) (same author as this repo). |
| This repo (**Banno Pulse**) | Full financial-wellness plugin sample: same OAuth kit, plus dashboard UI, Consumer API usage, D1 goals, deploy scripts, Docker toolbox, and Cursor-first docs. |

When you reuse or fork either project, keep the MIT license notice and credit the upstream sample where you derived auth/session patterns.

Build-your-own guide on top of Pulse’s kit: [plugin-starter.md](./plugin-starter.md).

---

## Cloudflare — platform & patterns

Official product docs used day-to-day: [Workers](https://developers.cloudflare.com/workers/) · [Wrangler](https://developers.cloudflare.com/workers/wrangler/) · [KV](https://developers.cloudflare.com/kv/) · [D1](https://developers.cloudflare.com/d1/) · [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).

Deploy paths for this repo: [setup-cloudflare.md](./setup-cloudflare.md).

### Blog posts (serverless ideas worth tracking)

These are **external** Cloudflare engineering posts — useful context for plugin hosts, agent-friendly deploys, caching, and multi-tenant durable work. They are not required to run Pulse today.

| Post | Relevance to Banno / Workers plugins |
|------|--------------------------------------|
| [Temporary Cloudflare Accounts for AI agents](https://blog.cloudflare.com/temporary-accounts/) | `wrangler deploy --temporary` — short-lived accounts so agents (or first-time builders) can ship a Worker without a full signup loop, then claim the account within 60 minutes. Useful for Cursor/agent demos and “try before you own” flows. |
| [Workers Cache](https://blog.cloudflare.com/workers-cache/) | Tiered cache in front of a Worker via Wrangler `cache` config + standard `Cache-Control` / purge-by-tag. Relevant if a plugin serves cacheable public assets or API responses that should skip Worker CPU on hits. |
| [Dynamic Workflows](https://blog.cloudflare.com/dynamic-workflows/) | Durable Workflows whose `run` code can differ per tenant/agent (via `@cloudflare/dynamic-workflows`), not only classes baked into one deploy. Interesting for multi-FI or AI-authored long-running plugin backends later. |

---

## In this repo

| Doc | When you need it |
|-----|------------------|
| [../README.md](../README.md) | Supported Docker journey |
| [setup-docker.md](./setup-docker.md) | CF login confirm, JH keys, deploy, callback pause |
| [setup-banno.md](./setup-banno.md) | Redirect URI + plugin card |
| [setup-cloudflare.md](./setup-cloudflare.md) | KV, D1, token deploy, Builds / Actions |
| [setup-mcp.md](./setup-mcp.md) | Cloudflare MCP in Cursor |
| [host-dev.md](./host-dev.md) | Optional host Node (not onboarding) |
| [plugin-starter.md](./plugin-starter.md) | Reuse `src/plugin` for a new UI |
| [../architecture.md](../architecture.md) | System design |
| [../security.md](../security.md) | Security controls |

---

## Attribution note

Documentation and sample lineage should stay clear for readers on JackHenry.Dev, GitHub, and partner reviews: credit [BannoCloudflarePublic](https://github.com/alex-carlston/BannoCloudflarePublic), keep Jack Henry / Cloudflare trademarks and docs links accurate, and prefer linking out (this page) over copying large third-party docs into the repo.
