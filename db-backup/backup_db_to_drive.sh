#!/usr/bin/env bash
set -euo pipefail

# Automated SQLite backup -> encrypted tar -> Google Drive upload
# Requirements:
# - gog CLI authenticated for Drive
# - openssl, tar, find
# - optional: openclaw CLI for Telegram alerts

PROJECT_DIR="${PROJECT_DIR:-$PWD}"
BACKUP_WORK_DIR="${BACKUP_WORK_DIR:-$HOME/.local/share/db-backups}"
STATE_DIR="${STATE_DIR:-$BACKUP_WORK_DIR/state}"
TMP_DIR="${TMP_DIR:-$BACKUP_WORK_DIR/tmp}"
DRIVE_FOLDER_ID="${DRIVE_FOLDER_ID:-}"
GOG_ACCOUNT="${GOG_ACCOUNT:-}"
PASSPHRASE="${BACKUP_PASSPHRASE:-}"
RETENTION_COUNT="${RETENTION_COUNT:-7}"
SLOT_FILE="$STATE_DIR/slot"
MANIFEST_FILE="$STATE_DIR/latest_manifest.txt"
TELEGRAM_TARGET="${TELEGRAM_TARGET:-}"

mkdir -p "$BACKUP_WORK_DIR" "$STATE_DIR" "$TMP_DIR"

alert_failure() {
  local msg="$1"
  echo "[BACKUP-ERROR] $msg" >&2
  if [[ -n "$TELEGRAM_TARGET" ]] && command -v openclaw >/dev/null 2>&1; then
    openclaw message send --channel telegram --target "$TELEGRAM_TARGET" --message "🚨 DB backup failed on $(hostname): $msg" >/dev/null 2>&1 || true
  fi
}

on_error() {
  alert_failure "line $1 (exit $2)"
}
trap 'on_error ${LINENO} $?' ERR

if [[ -z "$PASSPHRASE" ]]; then
  alert_failure "BACKUP_PASSPHRASE is not set"
  exit 1
fi

if [[ -z "$DRIVE_FOLDER_ID" ]]; then
  alert_failure "DRIVE_FOLDER_ID is not set"
  exit 1
fi

if ! command -v gog >/dev/null 2>&1; then
  alert_failure "gog CLI not found"
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  alert_failure "openssl not found"
  exit 1
fi

# Determine rolling slot [0..RETENTION_COUNT-1]
slot=0
if [[ -f "$SLOT_FILE" ]]; then
  slot=$(<"$SLOT_FILE")
fi
slot=$(( (slot + 1) % RETENTION_COUNT ))
printf '%s' "$slot" > "$SLOT_FILE"

stamp=$(date +"%Y%m%d-%H%M%S")
archive_plain="$TMP_DIR/sqlite-backup-$stamp-slot$slot.tar.gz"
archive_enc="$TMP_DIR/sqlite-backup-slot$slot.enc"
manifest_tmp="$TMP_DIR/manifest-$stamp.txt"

# Auto-discover sqlite files (exclude obvious caches/build dirs)
mapfile -t db_files < <(
  find "$PROJECT_DIR" \
    -type f \
    \( -iname "*.db" -o -iname "*.sqlite" -o -iname "*.sqlite3" \) \
    -not -path "*/.git/*" \
    -not -path "*/node_modules/*" \
    -not -path "*/.venv/*" \
    -not -path "*/venv/*" \
    -not -path "*/dist/*" \
    -not -path "*/build/*" \
    -print
)

if [[ ${#db_files[@]} -eq 0 ]]; then
  alert_failure "No SQLite databases found in $PROJECT_DIR"
  exit 1
fi

printf '%s\n' "# Backup manifest" > "$manifest_tmp"
printf '%s\n' "timestamp=$stamp" >> "$manifest_tmp"
printf '%s\n' "project_dir=$PROJECT_DIR" >> "$manifest_tmp"
printf '%s\n' "count=${#db_files[@]}" >> "$manifest_tmp"
printf '%s\n' "" >> "$manifest_tmp"
for f in "${db_files[@]}"; do
  rel="${f#$PROJECT_DIR/}"
  printf '%s\n' "$rel" >> "$manifest_tmp"
done
cp "$manifest_tmp" "$MANIFEST_FILE"

# Build tar from discovered files + manifest
(
  cd "$PROJECT_DIR"
  tar -czf "$archive_plain" \
    --transform "s|^|data/|" \
    "${db_files[@]/#$PROJECT_DIR\//}" \
    --transform "s|^|meta/|" \
    "$manifest_tmp"
)

# Encrypt archive
openssl enc -aes-256-cbc -pbkdf2 -salt \
  -in "$archive_plain" \
  -out "$archive_enc" \
  -pass env:BACKUP_PASSPHRASE

# Upload, replacing previous file in same slot if exists
remote_name="sqlite-backup-slot$slot.enc"
search_query="name = '$remote_name' and '$DRIVE_FOLDER_ID' in parents and trashed = false"

replace_id=""
if [[ -n "$GOG_ACCOUNT" ]]; then
  search_json=$(gog --account "$GOG_ACCOUNT" drive search "$search_query" --max-results 5 --json || true)
else
  search_json=$(gog drive search "$search_query" --max-results 5 --json || true)
fi
replace_id=$(python3 - <<'PY' "$search_json"
import json,sys
try:
  data=json.loads(sys.argv[1])
  files=data.get('files',[])
  print(files[0]['id'] if files else '')
except Exception:
  print('')
PY
)

if [[ -n "$GOG_ACCOUNT" ]]; then
  if [[ -n "$replace_id" ]]; then
    gog --account "$GOG_ACCOUNT" drive upload "$archive_enc" --folder "$DRIVE_FOLDER_ID" --name "$remote_name" --replace "$replace_id" >/dev/null
  else
    gog --account "$GOG_ACCOUNT" drive upload "$archive_enc" --folder "$DRIVE_FOLDER_ID" --name "$remote_name" >/dev/null
  fi
else
  if [[ -n "$replace_id" ]]; then
    gog drive upload "$archive_enc" --folder "$DRIVE_FOLDER_ID" --name "$remote_name" --replace "$replace_id" >/dev/null
  else
    gog drive upload "$archive_enc" --folder "$DRIVE_FOLDER_ID" --name "$remote_name" >/dev/null
  fi
fi

rm -f "$archive_plain" "$archive_enc" "$manifest_tmp"
echo "Backup success: slot=$slot, files=${#db_files[@]}, remote=$remote_name"
