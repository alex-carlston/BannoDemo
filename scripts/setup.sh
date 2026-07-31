#!/usr/bin/env bash
# LEGACY / UNSUPPORTED for onboarding — use Docker instead:
#   cp .env.example .env && docker compose run --rm quickstart
# See README.md and docs/setup-docker.md / docs/host-dev.md
#
# First-time (or refresh) setup for Banno Pulse on macOS / Linux.
# Windows users: prefer scripts/setup.ps1 (or setup.cmd).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

REFRESH_AUTH=0
SKIP_INSTALL=0

for arg in "$@"; do
  case "$arg" in
    --refresh-auth) REFRESH_AUTH=1 ;;
    --skip-install) SKIP_INSTALL=1 ;;
    -h|--help)
      cat <<'EOF'
Usage: ./scripts/setup.sh [--refresh-auth] [--skip-install]

  --refresh-auth   Force wrangler logout + login
  --skip-install   Skip npm install
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

step() { printf '\n==> %s\n' "$1"; }
ok()   { printf '    OK  %s\n' "$1"; }
warn() { printf '    !!  %s\n' "$1"; }
fail() { printf '    XX  %s\n' "$1" >&2; }

ensure_node() {
  step "Checking Node.js"

  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    fail "Node.js / npm not found on PATH."
    cat <<'EOF'

Install Node.js 20 LTS, then re-run this script.

  Option A — Official installer
    https://nodejs.org  → download LTS for macOS/Linux → install → reopen terminal

  Option B — Homebrew (macOS)
    brew install node@20

  Option C — nvm
    nvm install 20 && nvm use 20

EOF
    if command -v open >/dev/null 2>&1; then
      open "https://nodejs.org" >/dev/null 2>&1 || true
    elif command -v xdg-open >/dev/null 2>&1; then
      xdg-open "https://nodejs.org" >/dev/null 2>&1 || true
    fi
    exit 1
  fi

  local major
  major="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
  ok "node $(node -v)  |  npm $(npm -v)"

  if [[ -z "$major" || "$major" -lt 18 ]]; then
    fail "Node.js 18.18+ required (20 LTS recommended). Found major=$major"
    exit 1
  fi
}

ensure_npm_install() {
  if [[ "$SKIP_INSTALL" -eq 1 ]]; then
    step "Skipping npm install (--skip-install)"
    return
  fi
  step "Installing npm dependencies"
  npm install
  ok "Dependencies installed (includes local wrangler)"
}

ensure_wrangler_auth() {
  step "Checking Cloudflare / Wrangler login"

  if [[ ! -d "$REPO_ROOT/node_modules/wrangler" ]]; then
    fail "Local wrangler missing. Re-run without --skip-install."
    exit 1
  fi

  local whoami_out whoami_exit=0
  set +e
  whoami_out="$(npx --yes wrangler whoami 2>&1)"
  whoami_exit=$?
  set -e
  printf '%s\n' "$whoami_out"

  local logged_in=0
  if [[ $whoami_exit -eq 0 ]] && ! grep -Eqi 'not logged in|not authenticated|login required' <<<"$whoami_out"; then
    logged_in=1
  fi

  if [[ "$REFRESH_AUTH" -eq 1 || "$logged_in" -eq 0 ]]; then
    if [[ "$REFRESH_AUTH" -eq 1 ]]; then
      warn "Refreshing Wrangler auth (--refresh-auth)."
      npx --yes wrangler logout || true
    else
      warn "Not logged in (or whoami failed). Starting login."
    fi
    echo "A browser window will open — pick the Cloudflare account that should own this Worker."
    npx --yes wrangler login
    npx --yes wrangler whoami
  else
    ok "Wrangler is authenticated (see account/email above)."
    printf 'Wrong Cloudflare account? Log out and re-login now? [y/N] '
    read -r switch || true
    if [[ "$switch" =~ ^[Yy]$ ]]; then
      npx --yes wrangler logout || true
      npx --yes wrangler login
      npx --yes wrangler whoami
    fi
  fi

  cat <<'EOF'

Tip: pin the account in wrangler.jsonc with "account_id": "<id from whoami>"
     so deploys cannot land in the wrong account.
     Multi-account workflows: https://developers.cloudflare.com/workers/wrangler/profiles/
EOF
}

ensure_dev_vars() {
  step "Local secrets (.dev.vars)"
  if [[ ! -f "$REPO_ROOT/.dev.vars" ]]; then
    if [[ -f "$REPO_ROOT/.dev.vars.example" ]]; then
      cp "$REPO_ROOT/.dev.vars.example" "$REPO_ROOT/.dev.vars"
      ok "Created .dev.vars from .dev.vars.example — edit it before local/dev runs."
    else
      warn ".dev.vars.example missing; create .dev.vars manually."
    fi
  else
    ok ".dev.vars already exists (left unchanged)"
  fi
}

show_next_steps() {
  step "Next steps"
  cat <<'EOF'

1) Fill .dev.vars (CLIENT_ID, CLIENT_SECRET, ENV_URI, secrets)

2) Jack Henry dashboard (test user, plugin, external app):
     https://jackhenry.dev/open-api-docs/getting-started/

3) Cloudflare MCP in Cursor:
     docs/setup-mcp.md

4) Deploy (auto-provisions KV + D1, applies migrations):
     ./scripts/deploy.sh
     # first time, set secrets:
     npx wrangler secret put CLIENT_SECRET
     npx wrangler secret put SESSION_ENC_SECRET
     npx wrangler secret put COOKIE_SIGNING_SECRET

5) Optional — local:
     npm run dev
     # redirect: http://localhost:8787/callback/plugin

Guides: README.md · docs/setup-banno.md · docs/setup-cloudflare.md · docs/setup-mcp.md

EOF
}

echo "Banno Pulse — macOS/Linux setup"
ensure_node
ensure_npm_install
ensure_wrangler_auth
ensure_dev_vars
show_next_steps
echo "Setup finished."
