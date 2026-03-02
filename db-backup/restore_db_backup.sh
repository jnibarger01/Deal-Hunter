#!/usr/bin/env bash
set -euo pipefail

# Restore from encrypted SQLite backup archive.
# Usage:
#   ./restore_db_backup.sh /path/to/sqlite-backup-slotN.enc /restore/target/dir

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <encrypted_backup_file.enc> <restore_target_dir>"
  exit 1
fi

ENC_FILE="$1"
RESTORE_DIR="$2"
PASSPHRASE="${BACKUP_PASSPHRASE:-}"

if [[ ! -f "$ENC_FILE" ]]; then
  echo "Backup file not found: $ENC_FILE" >&2
  exit 1
fi

if [[ -z "$PASSPHRASE" ]]; then
  echo "BACKUP_PASSPHRASE is not set" >&2
  exit 1
fi

mkdir -p "$RESTORE_DIR"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

TAR_FILE="$TMP_DIR/restore.tar.gz"

openssl enc -d -aes-256-cbc -pbkdf2 \
  -in "$ENC_FILE" \
  -out "$TAR_FILE" \
  -pass env:BACKUP_PASSPHRASE

# Extract archive into restore dir
mkdir -p "$RESTORE_DIR"
tar -xzf "$TAR_FILE" -C "$RESTORE_DIR"

echo "Restore complete."
echo "Recovered data under: $RESTORE_DIR/data"
echo "Manifest at: $RESTORE_DIR/meta"
