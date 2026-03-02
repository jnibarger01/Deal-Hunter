#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/config/.env"
[[ -f "$ENV_FILE" ]] || ENV_FILE="$SCRIPT_DIR/config/.env.example"
# shellcheck disable=SC1090
source "$ENV_FILE"

DB_PATH="${DB_PATH:-$SCRIPT_DIR/state/automation.db}"

usage() {
  cat <<EOF
Usage: $0 <message_id> <urgent|not-urgent>

Applies feedback to local model weights:
- sender weight adjusted by +/-1.5
- keyword weights from subject adjusted by +/-0.4
- urgent_events status set to 'confirmed' or 'dismissed'
EOF
}

[[ $# -eq 2 ]] || { usage; exit 1; }
MSG_ID="$1"
LABEL="$2"
[[ "$LABEL" == "urgent" || "$LABEL" == "not-urgent" ]] || { usage; exit 1; }

python3 - "$DB_PATH" "$MSG_ID" "$LABEL" <<'PY'
import re, sqlite3, sys

db, msg_id, label = sys.argv[1], sys.argv[2], sys.argv[3]
con=sqlite3.connect(db)
con.row_factory=sqlite3.Row
cur=con.cursor()

row=cur.execute("select sender,subject from urgent_events where msg_id=?", (msg_id,)).fetchone()
if not row:
    row=cur.execute("select sender,subject from processed_messages where msg_id=?", (msg_id,)).fetchone()

if not row:
    print(f"Message id not found: {msg_id}")
    raise SystemExit(1)

sender=(row['sender'] or '').strip().lower()
subject=(row['subject'] or '').lower()

sender_delta = 1.5 if label == 'urgent' else -1.5
kw_delta = 0.4 if label == 'urgent' else -0.4

if sender:
    cur.execute(
        "insert into sender_weights(sender,weight) values(?,?) on conflict(sender) do update set weight=weight+excluded.weight, updated_at=CURRENT_TIMESTAMP",
        (sender,sender_delta)
    )

words=[w for w in re.findall(r"[a-zA-Z]{4,}", subject) if w not in {'re','fwd','from','with','that','this','have','your','about'}]
for kw in sorted(set(words[:8])):
    cur.execute(
        "insert into keyword_weights(keyword,weight) values(?,?) on conflict(keyword) do update set weight=weight+excluded.weight, updated_at=CURRENT_TIMESTAMP",
        (kw,kw_delta)
    )

status='confirmed' if label == 'urgent' else 'dismissed'
cur.execute("update urgent_events set status=? where msg_id=?", (status,msg_id))
con.commit()
print(f"Feedback applied: {msg_id} -> {label}")
PY
