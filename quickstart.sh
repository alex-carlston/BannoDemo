#!/usr/bin/env bash
# Run from the cloned repo root (e.g. after: git clone … && cd BannoDemo).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found. Install Docker Desktop, start it, then re-run ./quickstart.sh"
  echo "https://www.docker.com/products/docker-desktop/"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is installed but not running. Start Docker Desktop, then re-run ./quickstart.sh"
  exit 1
fi

if [[ ! -f "$ROOT/.env" ]]; then
  if [[ ! -f "$ROOT/.env.example" ]]; then
    echo "Missing .env.example. Clone https://github.com/alex-carlston/BannoDemo.git and run from that folder."
    exit 1
  fi
  cp "$ROOT/.env.example" "$ROOT/.env"
  echo "Created .env from .env.example."
  echo "Edit .env now: set CLIENT_ID, CLIENT_SECRET, SESSION_ENC_SECRET, COOKIE_SIGNING_SECRET."
  echo "Then run:  ./quickstart.sh"
  exit 1
fi

# Load .env for preflight checks (do not export blindly into the shell for secrets display).
get_env() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "$ROOT/.env" | tail -n1 || true)"
  printf '%s' "${line#*=}"
}

CLIENT_ID="$(get_env CLIENT_ID)"
CLIENT_SECRET="$(get_env CLIENT_SECRET)"
SESSION_ENC_SECRET="$(get_env SESSION_ENC_SECRET)"
COOKIE_SIGNING_SECRET="$(get_env COOKIE_SIGNING_SECRET)"

missing=0
for key in CLIENT_ID CLIENT_SECRET SESSION_ENC_SECRET COOKIE_SIGNING_SECRET; do
  val="$(get_env "$key")"
  if [[ -z "$val" ]]; then
    echo "Missing required value in .env: $key"
    missing=1
  fi
done

if [[ "$missing" -eq 1 ]]; then
  echo
  echo "Edit .env (from .env.example), set every required field, save, then re-run ./quickstart.sh"
  echo "Generate secrets with:  openssl rand -base64 32"
  exit 1
fi

if [[ "$SESSION_ENC_SECRET" == "$COOKIE_SIGNING_SECRET" ]]; then
  echo "SESSION_ENC_SECRET and COOKIE_SIGNING_SECRET must be different values."
  exit 1
fi

echo "Using repo: $ROOT"
echo "CLIENT_ID is set (${#CLIENT_ID} chars). Starting Docker quickstart…"
echo
echo "Note: --service-ports publishes host :8976 for the Cloudflare login callback."
echo

# --service-ports is required: `docker compose run` does NOT publish `ports:` by default.
# Without it, the browser hits http://localhost:8976/... and nothing is listening.
exec docker compose run --rm --service-ports quickstart
