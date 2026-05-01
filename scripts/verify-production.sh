#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="server/.env"
HEALTH_URL="${HEALTHCHECK_URL:-}"
RANKED_URL="${RANKED_URL:-}"
CONNECTIONS_URL="${CONNECTIONS_URL:-}"
OPERATOR_TOKEN="${OPERATOR_INGEST_TOKEN:-}"

usage() {
  cat <<'EOF'
Usage: ./scripts/verify-production.sh [--env-file <path>] [--health-url <url>] [--ranked-url <url>] [--connections-url <url>] [--operator-token <token>]

Examples:
  ./scripts/verify-production.sh --env-file server/.env
  ./scripts/verify-production.sh --health-url https://api.example.com/ready
  ./scripts/verify-production.sh --health-url https://api.example.com/ready --ranked-url https://api.example.com/api/v1/ranked?limit=1
  ./scripts/verify-production.sh --health-url https://api.example.com/ready --connections-url https://api.example.com/api/v1/connections
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
    --ranked-url)
      RANKED_URL="$2"
      shift 2
      ;;
    --connections-url)
      CONNECTIONS_URL="$2"
      shift 2
      ;;
    --operator-token)
      OPERATOR_TOKEN="$2"
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

OPERATOR_TOKEN="${OPERATOR_TOKEN:-${OPERATOR_INGEST_TOKEN:-}}"

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
require_var SMTP_HOST
require_var SMTP_PORT
require_var SMTP_USER
require_var SMTP_PASS
require_var SMTP_FROM
require_var OPERATOR_INGEST_TOKEN
require_var OPERATOR_SECRET_KEY
require_var MARKETPLACE_DELETE_TOKEN

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

  base_url="${HEALTH_URL%/ready}"
  base_url="${base_url%/health}"

  if [[ -z "$RANKED_URL" ]]; then
    RANKED_URL="$base_url/api/v1/ranked?limit=1"
  fi

  if [[ -z "$CONNECTIONS_URL" ]]; then
    CONNECTIONS_URL="$base_url/api/v1/connections"
  fi
fi

if [[ -n "$RANKED_URL" ]]; then
  if ! ranked_body="$(curl -fsS "$RANKED_URL" 2>/dev/null)"; then
    echo "❌ Ranked endpoint failed: $RANKED_URL"
    failures=$((failures + 1))
  elif [[ "$ranked_body" == "[]" || "$ranked_body" == \[* ]]; then
    echo "✅ Ranked endpoint OK: $RANKED_URL"
  else
    warn "Ranked response was not a JSON array"
  fi
fi

if [[ -n "$CONNECTIONS_URL" ]]; then
  connections_headers=()
  if [[ -n "$OPERATOR_TOKEN" ]]; then
    connections_headers=(-H "X-Operator-Token: $OPERATOR_TOKEN")
  fi

  if ! connections_body="$(curl -fsS "${connections_headers[@]}" "$CONNECTIONS_URL" 2>/dev/null)"; then
    echo "❌ Connections endpoint failed: $CONNECTIONS_URL"
    failures=$((failures + 1))
  elif [[ "$connections_body" == *'"craigslist"'* && "$connections_body" == *'"ebay"'* ]]; then
    echo "✅ Connections endpoint OK: $CONNECTIONS_URL"
  else
    warn "Connections response missing craigslist/ebay payload"
  fi
fi

if [[ $failures -gt 0 ]]; then
  echo "FAILED ($failures errors, $warnings warnings)"
  exit 1
fi

echo "PASSED ($warnings warnings)"
