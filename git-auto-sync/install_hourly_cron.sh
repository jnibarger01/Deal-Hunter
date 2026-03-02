#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="/home/jace/.openclaw/workspace/git-auto-sync/git_auto_sync.sh"
ENV_FILE="/home/jace/.openclaw/workspace/git-auto-sync/.env"
LOG_FILE="/home/jace/.local/share/git-auto-sync.log"
mkdir -p "$(dirname "$LOG_FILE")"

if [[ ! -x "$SCRIPT_PATH" ]]; then
  chmod +x "$SCRIPT_PATH"
fi

CRON_LINE="0 * * * * source $ENV_FILE && $SCRIPT_PATH >> $LOG_FILE 2>&1"

existing=$(crontab -l 2>/dev/null || true)
if grep -Fq "$SCRIPT_PATH" <<< "$existing"; then
  echo "Cron entry already exists."
  exit 0
fi

{
  printf "%s\n" "$existing"
  printf "%s\n" "$CRON_LINE"
} | crontab -

echo "Installed hourly cron for git auto-sync."
echo "Entry: $CRON_LINE"
