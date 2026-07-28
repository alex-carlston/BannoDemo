#!/usr/bin/env bash
# Non-interactive deploy for CI / Docker.
# Auth: CLOUDFLARE_API_TOKEN (required). Optional: CLOUDFLARE_ACCOUNT_ID.
# Does not run wrangler login or prompt for confirmation.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

step() { printf '\n==> %s\n' "$1"; }
ok()   { printf '    OK  %s\n' "$1"; }
fail() { printf '    XX  %s\n' "$1" >&2; }

echo "Banno Pulse — CI deploy"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  fail "CLOUDFLARE_API_TOKEN is required (no interactive wrangler login in CI)."
  echo "Create a token with Workers + D1 + KV edit permissions, then export it."
  exit 1
fi

step "Checking Node.js"
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  fail "Node.js / npm not found."
  exit 1
fi
ok "node $(node -v)"

if [[ ! -d "$REPO_ROOT/node_modules/wrangler" ]]; then
  step "Installing dependencies"
  npm ci
fi

step "Verifying Cloudflare auth (API token)"
set +e
whoami_out="$(npx --yes wrangler whoami 2>&1)"
whoami_exit=$?
set -e
printf '%s\n' "$whoami_out"

if [[ $whoami_exit -ne 0 ]] || grep -Eqi 'not logged in|not authenticated|login required' <<<"$whoami_out"; then
  fail "CLOUDFLARE_API_TOKEN is missing or invalid."
  exit 1
fi
ok "authenticated"

step "Deploying Worker + D1 migrations"
npm run deploy

ok "Deploy finished"
