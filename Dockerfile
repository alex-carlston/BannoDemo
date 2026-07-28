# Deploy toolbox only — does NOT run the Worker.
# Production runtime is Cloudflare Workers (Wrangler uploads the bundle).
FROM node:20-bookworm-slim

WORKDIR /app

# Install deps first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Source needed for `wrangler deploy` + D1 migrations
COPY wrangler.jsonc tsconfig.json ./
COPY src ./src
COPY public ./public
COPY migrations ./migrations
COPY scripts/deploy-ci.sh ./scripts/deploy-ci.sh

RUN chmod +x ./scripts/deploy-ci.sh

# Auth via CLOUDFLARE_API_TOKEN (+ optional CLOUDFLARE_ACCOUNT_ID) at runtime.
# Do not bake secrets into the image.
ENTRYPOINT ["./scripts/deploy-ci.sh"]
