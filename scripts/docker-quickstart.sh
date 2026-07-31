#!/usr/bin/env bash
# Interactive Docker quickstart for Banno Pulse.
# Credentials live in repo-root `.env` (Docker). Does not require or overwrite
# `.dev.vars` unless you opt in at the end (keeps host/local / video flows separate).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env}"
SECRETS_FILE="$(mktemp)"
trap 'rm -f "$SECRETS_FILE"' EXIT

step() { printf '\n==> %s\n' "$1"; }
ok()   { printf '    OK  %s\n' "$1"; }
warn() { printf '    !!  %s\n' "$1"; }
fail() { printf '    XX  %s\n' "$1" >&2; }

rand_secret() {
  node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))"
}

# Load KEY=VALUE from .env without executing it.
load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local val="${BASH_REMATCH[2]}"
      val="${val%\"}"
      val="${val#\"}"
      val="${val%\'}"
      val="${val#\'}"
      # Do not clobber values already set in the process environment.
      if [[ -z "${!key:-}" ]]; then
        export "$key=$val"
      fi
    fi
  done < "$file"
}

# Upsert KEY=VALUE in .env (create file from example if needed).
set_env_var() {
  local key="$1"
  local val="$2"
  local tmp
  tmp="$(mktemp)"
  touch "$ENV_FILE"
  if grep -qE "^${key}=" "$ENV_FILE" 2>/dev/null; then
    # Avoid sed -i portability issues inside the container.
    awk -v k="$key" -v v="$val" '
      BEGIN { done=0 }
      $0 ~ "^"k"=" { print k"="v; done=1; next }
      { print }
      END { if (!done) print k"="v }
    ' "$ENV_FILE" > "$tmp"
    mv "$tmp" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$val" >> "$ENV_FILE"
    rm -f "$tmp"
  fi
  export "$key=$val"
}

prompt_value() {
  local key="$1"
  local label="$2"
  local current="${!key:-}"
  local input
  if [[ -n "$current" ]]; then
    local shown="$current"
    if [[ ${#current} -gt 12 ]]; then
      shown="${current:0:4}…${current: -4}"
    fi
    printf '%s [%s]: ' "$label" "$shown"
  else
    printf '%s: ' "$label"
  fi
  # Secrets: allow empty to keep existing; do not echo if label mentions secret/password.
  if [[ "$label" =~ [Ss]ecret|[Pp]assword|[Tt]oken ]]; then
    read -r -s input || true
    printf '\n'
  else
    read -r input || true
  fi
  if [[ -n "$input" ]]; then
    set_env_var "$key" "$input"
  elif [[ -z "$current" ]]; then
    fail "A value is required for $key"
    exit 1
  fi
}

is_logged_in() {
  local out exit_code=0
  set +e
  out="$(npx --yes wrangler whoami 2>&1)"
  exit_code=$?
  set -e
  printf '%s\n' "$out"
  if [[ $exit_code -ne 0 ]]; then
    return 1
  fi
  if grep -Eqi 'not logged in|not authenticated|login required|You are not authenticated' <<<"$out"; then
    return 1
  fi
  return 0
}

ensure_cloudflare_auth() {
  step "1/4 Cloudflare — login and confirm account"

  if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    ok "Using CLOUDFLARE_API_TOKEN from environment / .env"
    if ! is_logged_in; then
      fail "CLOUDFLARE_API_TOKEN is set but wrangler whoami failed."
      exit 1
    fi
    ok "Authenticated via API token"
    printf 'Deploy with this Cloudflare identity? [Y/n] '
    read -r answer || true
    if [[ "${answer:-}" =~ ^[Nn]$ ]]; then
      fail "Aborted. Unset CLOUDFLARE_API_TOKEN in .env to use interactive wrangler login instead."
      exit 1
    fi
    return 0
  fi

  if is_logged_in; then
    ok "Already logged in (see account above)"
  else
    warn "Not logged in — starting OAuth."
    cat <<'EOF'

  1. Copy the URL Wrangler prints below into your HOST browser (Chrome/Edge/Safari).
  2. Sign in to Cloudflare and approve Wrangler.
  3. Docker maps host port 8976 → this container for the OAuth callback.
  4. When the browser says success, return here — login should finish.

EOF
    # --browser=false: print the URL (host browser cannot be launched from most containers).
    npx --yes wrangler login --callback-host=0.0.0.0 --callback-port=8976 --browser=false
    if ! is_logged_in; then
      fail "Login did not complete. Re-run quickstart, or set CLOUDFLARE_API_TOKEN in .env."
      exit 1
    fi
  fi

  cat <<'EOF'

  CONFIRM: the Worker, KV, and D1 will be created under the Cloudflare account above.
EOF
  printf 'Deploy with this Cloudflare account? [Y/n] '
  read -r answer || true
  if [[ "${answer:-}" =~ ^[Nn]$ ]]; then
    echo "Logging out so you can pick another account…"
    npx --yes wrangler logout || true
    npx --yes wrangler login --callback-host=0.0.0.0 --callback-port=8976 --browser=false
    is_logged_in || { fail "Still not logged in."; exit 1; }
    printf 'Deploy with the NEW account shown above? [Y/n] '
    read -r answer2 || true
    if [[ "${answer2:-}" =~ ^[Nn]$ ]]; then
      fail "Aborted at Cloudflare account confirm."
      exit 1
    fi
  fi
  ok "Cloudflare account confirmed"
}

ensure_env_file() {
  step "Docker env file (.env)"
  if [[ ! -f "$ENV_FILE" ]] || [[ ! -s "$ENV_FILE" ]]; then
    if [[ -f "$REPO_ROOT/.env.example" ]]; then
      cp "$REPO_ROOT/.env.example" "$ENV_FILE"
      ok "Created .env from .env.example"
    else
      touch "$ENV_FILE"
      warn "Created empty .env (no .env.example found)"
    fi
  else
    ok ".env present"
  fi
  load_env_file "$ENV_FILE"
}

ensure_banno_credentials() {
  step "2/4 Jack Henry credentials (from .env)"

  if [[ -z "${ENV_URI:-}" ]]; then
    export ENV_URI="https://digital.garden-fi.com"
    set_env_var ENV_URI "$ENV_URI"
  fi

  # Prefer values already written to .env (clone → edit → run). Prompt only if blank.
  if [[ -z "${CLIENT_ID:-}" || -z "${CLIENT_SECRET:-}" ]]; then
    cat <<'EOF'

  .env is missing CLIENT_ID and/or CLIENT_SECRET.
  Paste them from https://jackhenry.dev/portal/dashboard

EOF
    prompt_value CLIENT_ID "CLIENT_ID (Jack Henry external application)"
    prompt_value CLIENT_SECRET "CLIENT_SECRET"
  else
    ok "CLIENT_ID / CLIENT_SECRET loaded from .env"
  fi

  if [[ -z "${ENV_URI:-}" ]]; then
    prompt_value ENV_URI "ENV_URI (Garden base URL)"
  else
    ok "ENV_URI=$ENV_URI"
  fi

  step "3/4 App secrets (from .env)"
  if [[ -z "${SESSION_ENC_SECRET:-}" ]]; then
    set_env_var SESSION_ENC_SECRET "$(rand_secret)"
    ok "Generated SESSION_ENC_SECRET → .env"
  else
    ok "SESSION_ENC_SECRET loaded from .env"
  fi
  if [[ -z "${COOKIE_SIGNING_SECRET:-}" ]]; then
    set_env_var COOKIE_SIGNING_SECRET "$(rand_secret)"
    ok "Generated COOKIE_SIGNING_SECRET → .env"
  else
    ok "COOKIE_SIGNING_SECRET loaded from .env"
  fi
}

write_secrets_file() {
  cat > "$SECRETS_FILE" <<EOF
CLIENT_SECRET=${CLIENT_SECRET}
SESSION_ENC_SECRET=${SESSION_ENC_SECRET}
COOKIE_SIGNING_SECRET=${COOKIE_SIGNING_SECRET}
EOF
}

deploy_worker() {
  local redirect="${REDIRECT_URI:-}"
  step "4/4 Deploy Worker + D1 + set callback URL"

  write_secrets_file

  local -a var_args=(
    --var "CLIENT_ID:${CLIENT_ID}"
    --var "ENV_URI:${ENV_URI}"
    --var "ENVIRONMENT:production"
    --var "PLUGIN_INITIAL_HEIGHT:600"
  )
  if [[ -n "$redirect" ]]; then
    var_args+=(--var "REDIRECT_URI:${redirect}")
  fi

  # Capture output so we can learn the workers.dev URL on first deploy.
  local out_file
  out_file="$(mktemp)"
  if ! npx --yes wrangler deploy --minify \
    "${var_args[@]}" \
    --secrets-file "$SECRETS_FILE" 2>&1 | tee "$out_file"; then
    fail "wrangler deploy failed"
    rm -f "$out_file"
    exit 1
  fi

  npx --yes wrangler d1 migrations apply banno-pulse-goals --remote

  local url
  url="$(grep -Eo 'https://[a-zA-Z0-9.-]+\.workers\.dev' "$out_file" | head -n1 || true)"
  rm -f "$out_file"
  if [[ -n "$url" ]]; then
    ok "Worker URL: $url"
    local callback="${url}/callback/plugin"
    if [[ -z "${REDIRECT_URI:-}" || "$REDIRECT_URI" != "$callback" ]]; then
      step "Updating REDIRECT_URI to deployed callback"
      set_env_var REDIRECT_URI "$callback"
      write_secrets_file
      npx --yes wrangler deploy --minify \
        --var "CLIENT_ID:${CLIENT_ID}" \
        --var "ENV_URI:${ENV_URI}" \
        --var "REDIRECT_URI:${callback}" \
        --var "ENVIRONMENT:production" \
        --var "PLUGIN_INITIAL_HEIGHT:600" \
        --secrets-file "$SECRETS_FILE"
      ok "Redeployed with REDIRECT_URI=$callback"
    fi
    pause_for_jackhenry_callback "$url" "$callback"
  else
    warn "Could not parse workers.dev URL from deploy output — set REDIRECT_URI in .env manually."
  fi
}

pause_for_jackhenry_callback() {
  local worker_url="$1"
  local callback="$2"
  cat <<EOF

========================================================================
  REQUIRED — paste into Jack Henry (dashboard)
========================================================================

  1) Open: https://jackhenry.dev/portal/dashboard

  2) External application → Redirect URI (exact):
       $callback

  3) Plugin configuration:
       Plugin URL  →  $worker_url
       Initial height → 600

  4) Save, then open Garden as your test user and launch the plugin.

  Guide: docs/setup-banno.md
========================================================================

EOF
  printf 'Press Enter after you have pasted the redirect URI into Jack Henry… '
  read -r _ || true
  ok "Continuing"
}

maybe_sync_dev_vars() {
  step "Optional — host local .dev.vars (skip unless you need npm run dev)"
  cat <<'EOF'

  Supported deploy path uses `.env` only.
  `.dev.vars` is only for optional host `npm run dev` (see docs/host-dev.md).

EOF
  printf 'Also write/update .dev.vars for host local wrangler? [y/N] '
  read -r sync || true
  if [[ ! "${sync:-}" =~ ^[Yy]$ ]]; then
    ok "Left .dev.vars alone"
    return 0
  fi
  cat > "$REPO_ROOT/.dev.vars" <<EOF
CLIENT_ID=${CLIENT_ID}
CLIENT_SECRET=${CLIENT_SECRET}
ENV_URI=${ENV_URI}
REDIRECT_URI=http://localhost:8787/callback/plugin
SESSION_ENC_SECRET=${SESSION_ENC_SECRET}
COOKIE_SIGNING_SECRET=${COOKIE_SIGNING_SECRET}
ENVIRONMENT=development
EOF
  ok "Wrote .dev.vars for localhost development"
}

print_banner() {
  cat <<'EOF'
Banno Pulse — Docker deploy

Expects a filled `.env` in the cloned repo (CLIENT_ID, CLIENT_SECRET, secrets).
Will confirm Cloudflare login, deploy the Worker, then print the Jack Henry callback URL.

EOF
}

print_banner
ensure_env_file
ensure_cloudflare_auth
ensure_banno_credentials
deploy_worker
maybe_sync_dev_vars

step "Done"
ok "Quickstart finished — Worker is on Cloudflare; runtime is not inside Docker."
