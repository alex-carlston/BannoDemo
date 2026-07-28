#!/usr/bin/env bash
# Deploy Banno Pulse to Cloudflare Workers (macOS / Linux).
# Windows users: prefer scripts/deploy.ps1 (or deploy.cmd).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

REFRESH_AUTH=0
SKIP_AUTH_CHECK=0

# Non-interactive when CI or API-token auth is present
if [[ -n "${CI:-}" || -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  SKIP_AUTH_CHECK=1
fi

for arg in "$@"; do
  case "$arg" in
    --refresh-auth) REFRESH_AUTH=1 ;;
    --skip-auth-check) SKIP_AUTH_CHECK=1 ;;
    -h|--help)
      cat <<'EOF'
Usage: ./scripts/deploy.sh [--refresh-auth] [--skip-auth-check]

  --refresh-auth      Force wrangler logout + login before deploy
  --skip-auth-check   Skip interactive account confirmation

For CI / Docker (API token, no prompts), use:
  ./scripts/deploy-ci.sh
  # or: npm run deploy:ci
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

# Prefer the dedicated CI path when an API token is set (no interactive login).
if [[ -n "${CLOUDFLARE_API_TOKEN:-}" && "$REFRESH_AUTH" -eq 0 ]]; then
  exec "$REPO_ROOT/scripts/deploy-ci.sh"
fi

step() { printf '\n==> %s\n' "$1"; }
ok()   { printf '    OK  %s\n' "$1"; }
fail() { printf '    XX  %s\n' "$1" >&2; }

echo "Banno Pulse — macOS/Linux deploy"

step "Checking Node.js"
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  fail "Node.js / npm not found. Run ./scripts/setup.sh first."
  echo "Or install Node 20 LTS from https://nodejs.org and reopen your terminal."
  exit 1
fi
major="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
ok "node $(node -v)"
if [[ -z "$major" || "$major" -lt 18 ]]; then
  fail "Node.js 18.18+ required. Run ./scripts/setup.sh"
  exit 1
fi

if [[ ! -d "$REPO_ROOT/node_modules/wrangler" ]]; then
  step "Installing dependencies (wrangler missing)"
  npm install
fi

step "Verifying Wrangler Cloudflare account"
if [[ "$REFRESH_AUTH" -eq 1 ]]; then
  echo "Refreshing auth..."
  npx --yes wrangler logout || true
  npx --yes wrangler login
fi

set +e
whoami_out="$(npx --yes wrangler whoami 2>&1)"
whoami_exit=$?
set -e
printf '%s\n' "$whoami_out"

if [[ $whoami_exit -ne 0 ]] || grep -Eqi 'not logged in|not authenticated|login required' <<<"$whoami_out"; then
  fail "Not logged in to Cloudflare."
  echo "Run:  ./scripts/setup.sh --refresh-auth"
  echo "  or:  ./scripts/deploy.sh --refresh-auth"
  exit 1
fi

if [[ "$SKIP_AUTH_CHECK" -eq 0 ]]; then
  printf 'Deploy with the Cloudflare account shown above? [Y/n] '
  read -r ok_answer || true
  if [[ "$ok_answer" =~ ^[Nn]$ ]]; then
    echo "Aborted. Re-auth with: ./scripts/setup.sh --refresh-auth"
    exit 1
  fi
fi

step "Deploying Worker + D1 migrations"
npm run deploy

ok "Deploy finished"
cat <<'EOF'

Copy the https://*.workers.dev URL from the output above.
Add this redirect URI in the Jack Henry dashboard:
  https://<your-worker>.workers.dev/callback/plugin
Keep localhost too if you still develop locally:
  http://localhost:8787/callback/plugin

Set wrangler.jsonc vars.REDIRECT_URI to the Worker callback, then redeploy if needed.
Guide: docs/setup-banno.md
EOF
