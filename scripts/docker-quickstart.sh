#!/usr/bin/env bash
# Interactive Docker quickstart for Banno Pulse.
# Credentials live in repo-root `.env` (Docker). Does not require or overwrite
# `.dev.vars` unless you opt in at the end (keeps host/local / video flows separate).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Host clone mount from docker-compose (`.:/host-repo`) so we can write copy-paste files.
HOST_REPO="${HOST_REPO:-/host-repo}"
if [[ ! -d "$HOST_REPO" ]]; then
  HOST_REPO="$REPO_ROOT"
fi

ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env}"
# Prefer writing .env through the host mount when present (same inode as host file).
if [[ -d /host-repo ]]; then
  ENV_FILE="/host-repo/.env"
fi
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
# If the host editor has .env locked or the bind mount is missing, warn but continue
# (deploy still uses in-memory exports).
set_env_var() {
  local key="$1"
  local val="$2"
  local tmp
  tmp="$(mktemp)"
  if ! touch "$ENV_FILE" 2>/dev/null; then
    warn "Cannot write $ENV_FILE (close the editor / check Docker mount). Continuing with in-memory $key."
    export "$key=$val"
    rm -f "$tmp"
    return 0
  fi
  if grep -qE "^${key}=" "$ENV_FILE" 2>/dev/null; then
    # Avoid sed -i portability issues inside the container.
    awk -v k="$key" -v v="$val" '
      BEGIN { done=0 }
      $0 ~ "^"k"=" { print k"="v; done=1; next }
      { print }
      END { if (!done) print k"="v }
    ' "$ENV_FILE" > "$tmp" || {
      warn "Failed updating $key in .env — value still used for this deploy."
      export "$key=$val"
      rm -f "$tmp"
      return 0
    }
    if ! mv "$tmp" "$ENV_FILE" 2>/dev/null; then
      warn "Could not replace .env (is it open/locked on the host?). Deploy still uses $key."
      rm -f "$tmp"
      export "$key=$val"
      return 0
    fi
  else
    if ! printf '%s=%s\n' "$key" "$val" >> "$ENV_FILE" 2>/dev/null; then
      warn "Could not append $key to .env. Deploy still uses in-memory value."
    fi
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

  Cloudflare login (Windows / macOS / Linux — same steps):

  1. Leave this terminal open. Wrangler is waiting for the browser callback.
  2. Copy the URL printed below into your HOST browser (Edge / Chrome / Safari).
  3. Sign in to Cloudflare and click Allow / Approve.
  4. Cloudflare redirects to http://localhost:8976/oauth/callback — that must
     reach THIS container (quickstart uses --service-ports for that).
  5. When the browser shows success, return here — login finishes automatically.

  If localhost:8976 fails to connect: Ctrl+C, then re-run ./quickstart.sh
  (Windows: quickstart.cmd). Do not paste the callback URL into chat.

  Alternative (no browser callback): put CLOUDFLARE_API_TOKEN in .env and re-run.
  Create a token: https://dash.cloudflare.com/profile/api-tokens
  (Edit Cloudflare Workers / D1 / KV).

EOF
    # --browser=false: print the URL (host browser cannot be launched from most containers).
    npx --yes wrangler login --callback-host=0.0.0.0 --callback-port=8976 --browser=false
    if ! is_logged_in; then
      fail "Login did not complete. Re-run quickstart with --service-ports, or set CLOUDFLARE_API_TOKEN in .env."
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
    cat <<'EOF'

  Re-login: open the new URL in your HOST browser. localhost:8976 must reach this container.

EOF
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
  if [[ -z "$url" ]]; then
    warn "Could not parse workers.dev URL from deploy output — set REDIRECT_URI in .env manually."
    return 0
  fi

  ok "Worker URL: $url"
  local callback="${url}/callback/plugin"

  # Always redeploy WITH REDIRECT_URI. First pass may have left it empty → /auth/login 500.
  if [[ "${REDIRECT_URI:-}" != "$callback" ]]; then
    step "Setting REDIRECT_URI on Worker (required for login)"
    set_env_var REDIRECT_URI "$callback"
  else
    set_env_var REDIRECT_URI "$callback"
  fi
  write_secrets_file
  npx --yes wrangler deploy --minify \
    --var "CLIENT_ID:${CLIENT_ID}" \
    --var "ENV_URI:${ENV_URI}" \
    --var "REDIRECT_URI:${callback}" \
    --var "ENVIRONMENT:production" \
    --var "PLUGIN_INITIAL_HEIGHT:600" \
    --secrets-file "$SECRETS_FILE"
  ok "Redeployed with REDIRECT_URI=$callback"

  verify_login_ready "$url" "$callback"
  pause_for_jackhenry_callback "$url" "$callback"
}

verify_login_ready() {
  local worker_url="$1"
  local callback="$2"
  step "Verifying Worker login config"

  # node:bookworm-slim has no curl — use Node fetch (always available in this image).
  local result
  result="$(
    node <<EOF
const base = ${JSON.stringify("$worker_url")};
const expected = ${JSON.stringify("$callback")};
(async () => {
  try {
    const setup = await fetch(base + "/__setup", { redirect: "manual" });
    if (setup.status === 200) {
      const j = await setup.json();
      if (j.ok && j.redirectUri === expected) {
        console.log("ok_setup");
        return;
      }
      if (j.redirectUri) {
        console.log("bad_setup:" + (j.redirectUri || ""));
        return;
      }
    }
  } catch (_) {}
  try {
    const login = await fetch(base + "/auth/login", { redirect: "manual" });
    const loc = login.headers.get("location") || "";
    if ((login.status === 302 || login.status === 301) && loc.includes("garden-fi.com")) {
      console.log("ok_login:" + login.status);
      return;
    }
    console.log("bad_login:" + login.status);
  } catch (e) {
    console.log("err:" + (e && e.message ? e.message : "fetch_failed"));
  }
})();
EOF
  )"

  case "$result" in
    ok_setup|ok_login:*)
      ok "Worker check passed ($result). Deploy succeeded."
      return 0
      ;;
  esac

  # Do not abort — deploy already finished; Jack Henry steps still apply.
  warn "Post-deploy check inconclusive ($result). If Garden login works, ignore this."
  cat <<EOF

  Optional check in your browser:
       ${worker_url}/__setup
  Expect ok:true and redirectUri:
       $callback

  /auth/login should redirect (302) to Garden — not return 500.

EOF
  return 0
}

pause_for_jackhenry_callback() {
  local worker_url="$1"
  local callback="$2"

  # Plain files on the host clone for copy/paste (avoids fighting an open `.env` editor).
  printf '%s\n' "$callback" > "$HOST_REPO/callback-url.txt" || true
  printf '%s\n' "$worker_url" > "$HOST_REPO/worker-url.txt" || true
  # Also try image workdir (harmless if not mounted back).
  printf '%s\n' "$callback" > "$REPO_ROOT/callback-url.txt" 2>/dev/null || true
  printf '%s\n' "$worker_url" > "$REPO_ROOT/worker-url.txt" 2>/dev/null || true

  cat <<EOF

========================================================================
  STOP — finish Jack Henry BEFORE opening Garden
========================================================================

  Auth fails with "Authentication failed. Please try signing in again."
  until the redirect URI is saved in the dashboard (exact match, FIRST in list).

  You do NOT need to paste this into .env yourself. Quickstart already set
  REDIRECT_URI on the Worker. Paste it into Jack Henry only.

  --- Copy these (also written to callback-url.txt / worker-url.txt) ---

  Redirect URI (External application) — must be FIRST in the list:
       $callback

  Plugin URL (plugin configuration) — use the CALLBACK path as the first
  redirect URI above. Do NOT use /auth/login as the plugin / redirect URL.
  Base Worker host (for docs / bookmarks only):
       $worker_url
  Initial height: 600

  After Save, open this check in a browser (should say ok:true):
       $worker_url/__setup

  --- Dashboard clicks ---

  1) https://jackhenry.dev/portal/dashboard
  2) External application (same Client ID as .env)
       → Redirect URI(s) → paste the Redirect URI above
       → Move it to the TOP if anything else is listed (e.g. localhost)
       → Save
  3) Plugin configuration
       → Plugin URL = Worker base URL above
       → Initial height = 600
       → Save
  4) ONLY THEN open Garden as your test user and launch the plugin:
       https://digital.garden-fi.com

  Guide: docs/setup-banno.md
========================================================================

EOF
  printf 'Press Enter AFTER you have Saved the redirect URI (and plugin) in Jack Henry… '
  read -r _ || true
  ok "Dashboard step acknowledged — open Garden now if you have not already"
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
