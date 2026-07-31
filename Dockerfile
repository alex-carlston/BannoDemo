# Deploy / quickstart toolbox — does NOT run the Worker.
# Production runtime is Cloudflare Workers (Wrangler uploads the bundle).
FROM node:22-bookworm-slim

WORKDIR /app

# Install deps first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Source needed for `wrangler deploy` + D1 migrations + interactive quickstart
COPY wrangler.jsonc tsconfig.json ./
COPY src ./src
COPY public ./public
COPY migrations ./migrations
COPY .env.example ./
COPY scripts/deploy-ci.sh scripts/docker-quickstart.sh ./scripts/

RUN chmod +x ./scripts/deploy-ci.sh ./scripts/docker-quickstart.sh

# Auth at runtime: interactive `wrangler login` (quickstart) or CLOUDFLARE_API_TOKEN (CI).
# Do not bake secrets into the image.
# Default entrypoint stays CI-safe; compose overrides for quickstart.
ENTRYPOINT ["./scripts/deploy-ci.sh"]
