#!/usr/bin/env bash
set -euo pipefail

SOURCE_DATABASE_URL="${SOURCE_DATABASE_URL:-${DATABASE_URL:-}}"
SCRATCH_DATABASE_URL="${SCRATCH_DATABASE_URL:-}"
DUMP_FILE="${DUMP_FILE:-}"
TABLES=(Deal TMVResult Score IngestSource MarketplaceSync)

usage() {
  cat <<'EOF'
Usage: ./scripts/backup-restore-drill.sh --source-url <postgres-url> --scratch-url <postgres-url> [--dump-file <path>]

Examples:
  ./scripts/backup-restore-drill.sh \
    --source-url postgresql://dealhunter:dealhunter_dev_password@localhost:5433/dealhunter \
    --scratch-url postgresql://dealhunter:dealhunter_dev_password@localhost:5433/dealhunter_restore_drill
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-url)
      SOURCE_DATABASE_URL="$2"
      shift 2
      ;;
    --scratch-url)
      SCRATCH_DATABASE_URL="$2"
      shift 2
      ;;
    --dump-file)
      DUMP_FILE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$SOURCE_DATABASE_URL" || -z "$SCRATCH_DATABASE_URL" ]]; then
  echo "Both --source-url and --scratch-url are required." >&2
  usage >&2
  exit 1
fi

if [[ "$SOURCE_DATABASE_URL" == "$SCRATCH_DATABASE_URL" ]]; then
  echo "Source and scratch databases must be different." >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

if [[ -z "$DUMP_FILE" ]]; then
  DUMP_FILE="$TMP_DIR/backup.dump"
fi

echo "→ Dumping source database"
pg_dump --file "$DUMP_FILE" "$SOURCE_DATABASE_URL"

echo "→ Resetting scratch database"
SCRATCH_DB_NAME="$(python3 - <<'PY' "$SCRATCH_DATABASE_URL"
from urllib.parse import urlparse
import sys
url = urlparse(sys.argv[1])
print(url.path.lstrip('/'))
PY
)"
SCRATCH_ADMIN_URL="$(python3 - <<'PY' "$SCRATCH_DATABASE_URL"
from urllib.parse import urlparse, urlunparse
import sys
url = urlparse(sys.argv[1])
print(urlunparse(url._replace(path='/postgres', params='', query='', fragment='')))
PY
)"
psql "$SCRATCH_ADMIN_URL" -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${SCRATCH_DB_NAME}' AND pid <> pg_backend_pid();" >/dev/null
psql "$SCRATCH_ADMIN_URL" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"${SCRATCH_DB_NAME}\";" >/dev/null
psql "$SCRATCH_ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${SCRATCH_DB_NAME}\";" >/dev/null

echo "→ Restoring dump into scratch database"
grep -v '^SET transaction_timeout = 0;$' "$DUMP_FILE" | psql "$SCRATCH_DATABASE_URL" -v ON_ERROR_STOP=1 >/dev/null

count_rows() {
  local db_url="$1"
  local table_name="$2"
  psql "$db_url" -Atqc "SELECT COUNT(*) FROM \"${table_name}\";"
}

echo "→ Comparing key table row counts"
for table in "${TABLES[@]}"; do
  source_count="$(count_rows "$SOURCE_DATABASE_URL" "$table")"
  scratch_count="$(count_rows "$SCRATCH_DATABASE_URL" "$table")"
  if [[ "$source_count" != "$scratch_count" ]]; then
    echo "❌ Row count mismatch for ${table}: source=${source_count} scratch=${scratch_count}" >&2
    exit 1
  fi
  echo "✅ ${table}: ${source_count} rows"
done

echo "PASSED backup/restore drill"
