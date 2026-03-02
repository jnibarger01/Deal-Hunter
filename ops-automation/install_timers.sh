#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UNIT_SRC="$SCRIPT_DIR/systemd"
UNIT_DST="$HOME/.config/systemd/user"

mkdir -p "$UNIT_DST"
cp -f "$UNIT_SRC"/*.service "$UNIT_DST"/
cp -f "$UNIT_SRC"/*.timer "$UNIT_DST"/

systemctl --user daemon-reload
systemctl --user enable --now daily-brief.timer
systemctl --user enable --now urgent-email-scan.timer

echo "Installed and enabled user timers:"
systemctl --user list-timers --all | grep -E 'daily-brief|urgent-email-scan' || true
