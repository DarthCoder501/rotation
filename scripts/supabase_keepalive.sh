#!/usr/bin/env bash
# Manually ping Supabase so a free-tier project does not pause from inactivity.
# Usage (from repo root or scripts/):
#   ./scripts/supabase_keepalive.sh
# Loads scripts/.env if present (SUPABASE_URL + anon key), or falls back to
# NEXT_PUBLIC_* vars from the environment / apps/web/.env.local.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

load_env_file() {
  local file="$1"
  if [ -f "$file" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$file"
    set +a
  fi
}

load_env_file "$SCRIPT_DIR/.env"
load_env_file "$ROOT_DIR/apps/web/.env.local"
load_env_file "$ROOT_DIR/apps/web/.env"

URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
KEY="${SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}"

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "Set SUPABASE_URL and SUPABASE_ANON_KEY (or NEXT_PUBLIC_* equivalents)." >&2
  exit 1
fi

BASE="${URL%/}"
ENDPOINT="${BASE}/rest/v1/fragrances?select=id&limit=1"

HTTP_CODE=$(curl -sS -o /tmp/supabase-keepalive.json -w "%{http_code}" \
  -H "apikey: ${KEY}" \
  -H "Authorization: Bearer ${KEY}" \
  -H "Accept: application/json" \
  "$ENDPOINT")

echo "HTTP ${HTTP_CODE}"
cat /tmp/supabase-keepalive.json
echo

if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 300 ]; then
  echo "Keepalive request failed." >&2
  exit 1
fi

echo "Supabase keepalive OK."
