#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="server/.env"
HEALTH_URL="${HEALTHCHECK_URL:-}"

usage() {
  cat <<'EOF'
Usage: ./scripts/verify-production.sh [--env-file <path>] [--health-url <url>]

Examples:
  ./scripts/verify-production.sh --env-file server/.env
  ./scripts/verify-production.sh --health-url https://api.example.com/ready
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --health-url)
      HEALTH_URL="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -f "$ENV_FILE" ]]; then
  set -a && source "$ENV_FILE" && set +a
fi

failures=0
warnings=0

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "❌ Missing required env var: $name"
    failures=$((failures + 1))
  else
    echo "✅ $name is set"
  fi
}

warn() {
  echo "⚠️  $1"
  warnings=$((warnings + 1))
}

require_var NODE_ENV
require_var DATABASE_URL
require_var JWT_SECRET
require_var CORS_ORIGIN
require_var FRONTEND_URL

if [[ "${NODE_ENV:-}" != "production" ]]; then
  warn "NODE_ENV should be production"
fi

if [[ -n "${JWT_SECRET:-}" && ${#JWT_SECRET} -lt 32 ]]; then
  echo "❌ JWT_SECRET must be at least 32 chars"
  failures=$((failures + 1))
fi

if [[ -n "${DATABASE_URL:-}" && "$DATABASE_URL" != *"supabase.co"* ]]; then
  warn "DATABASE_URL does not appear to be Supabase"
fi

if [[ -z "${TRUST_PROXY:-}" ]]; then
  warn "TRUST_PROXY is unset"
fi

if [[ -n "$HEALTH_URL" ]]; then
  if ! body="$(curl -fsS "$HEALTH_URL" 2>/dev/null)"; then
    echo "❌ Health check failed: $HEALTH_URL"
    failures=$((failures + 1))
  elif [[ "$body" == *'"status":"ok"'* || "$body" == *'"status":"ready"'* || "$body" == *'"status": "ok"'* || "$body" == *'"status": "ready"'* ]]; then
    echo "✅ Health endpoint OK: $HEALTH_URL"
  else
    warn "Health response missing status=ok/ready"
  fi
fi

if [[ $failures -gt 0 ]]; then
  echo "FAILED ($failures errors, $warnings warnings)"
  exit 1
fi

echo "PASSED ($warnings warnings)"
