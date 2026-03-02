#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/config/.env"
[[ -f "$ENV_FILE" ]] || ENV_FILE="$SCRIPT_DIR/config/.env.example"
# shellcheck disable=SC1090
source "$ENV_FILE"

STATE_DIR="${STATE_DIR:-$SCRIPT_DIR/state}"
DB_PATH="${DB_PATH:-$STATE_DIR/automation.db}"
OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"
DRY_RUN="${DRY_RUN:-1}"
GOG_CAL_CMD="${GOG_CAL_CMD:-gog calendar today --format json}"

mkdir -p "$STATE_DIR"

log(){ printf '[daily-brief] %s\n' "$*"; }

init_db() {
  sqlite3 "$DB_PATH" <<'SQL'
CREATE TABLE IF NOT EXISTS contact_context (
  email TEXT PRIMARY KEY,
  interaction_count INTEGER NOT NULL DEFAULT 0,
  urgent_count INTEGER NOT NULL DEFAULT 0,
  last_subject TEXT,
  last_ts TEXT
);
CREATE TABLE IF NOT EXISTS urgent_events (
  msg_id TEXT PRIMARY KEY,
  sender TEXT,
  subject TEXT,
  score REAL,
  ts TEXT,
  status TEXT DEFAULT 'open'
);
SQL
}

fetch_calendar_json() {
  if ! command -v gog >/dev/null 2>&1; then
    log "gog CLI not found. Calendar section will be empty."
    echo '[]'
    return 0
  fi

  local out rc
  set +e
  out="$(bash -lc "$GOG_CAL_CMD" 2>&1)"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]]; then
    log "Calendar fetch failed. Command: $GOG_CAL_CMD"
    log "Error: $out"
    log "Auth/setup likely required. Try: gog auth login"
    echo '[]'
    return 0
  fi

  if echo "$out" | python3 -c 'import json,sys; json.loads(sys.stdin.read())' >/dev/null 2>&1; then
    echo "$out"
  else
    echo '[]'
  fi
}

compose_message() {
  local calendar_json="$1"
  python3 - "$calendar_json" "$DB_PATH" <<'PY'
import json, sqlite3, sys, datetime as dt
cal_raw=sys.argv[1]
db=sys.argv[2]

try:
    cal=json.loads(cal_raw)
except Exception:
    cal=[]

if isinstance(cal,dict):
    for k in ('events','items','data'):
        if isinstance(cal.get(k),list):
            cal=cal[k]
            break
    else:
        cal=[cal]

lines=[]
lines.append(f"📌 Daily Brief — {dt.datetime.now().strftime('%a %Y-%m-%d')}")
lines.append("")

lines.append("🗓️ Today’s Calendar")
if not cal:
    lines.append("• No events found (or calendar unavailable).")
else:
    for ev in cal[:12]:
        if not isinstance(ev,dict):
            continue
        title=(ev.get('summary') or ev.get('title') or '(untitled)').strip()
        start=(ev.get('start') or ev.get('startTime') or ev.get('start_date') or '')
        if isinstance(start,dict):
            start=start.get('dateTime') or start.get('date') or ''
        lines.append(f"• {start} — {title}")

con=sqlite3.connect(db)
con.row_factory=sqlite3.Row

lines.append("")
lines.append("👥 Contact Context (from recent email interactions)")
rows=list(con.execute("select email,interaction_count,urgent_count,last_subject,last_ts from contact_context order by interaction_count desc, urgent_count desc limit 5"))
if not rows:
    lines.append("• No local interaction history yet.")
else:
    for r in rows:
        lines.append(f"• {r['email']} — interactions:{r['interaction_count']}, urgent:{r['urgent_count']}, last:" + (r['last_subject'] or '(none)'))

lines.append("")
lines.append("🚨 Pending Urgent Emails")
urgent=list(con.execute("select msg_id,sender,subject,score,ts from urgent_events where status='open' order by score desc, ts desc limit 10"))
if not urgent:
    lines.append("• None.")
else:
    for r in urgent:
        lines.append(f"• [{r['score']}] {r['sender']} — {r['subject'] or '(no subject)'} (id:{r['msg_id']})")

lines.append("")
lines.append("⏳ Waiting-on Items")
waiting=list(con.execute("select sender,subject,ts from urgent_events where status='open' and (lower(subject) like '%waiting%' or lower(subject) like '%follow up%' or lower(subject) like '%pending%') order by ts desc limit 8"))
if not waiting:
    lines.append("• None detected.")
else:
    for r in waiting:
        lines.append(f"• {r['sender']} — {r['subject']} ({r['ts']})")

print("\n".join(lines))
PY
}

send_message() {
  local body="$1"
  if [[ "$DRY_RUN" == "1" ]]; then
    log "DRY_RUN=1, would send:\n$body"
    return 0
  fi

  if [[ -z "${TELEGRAM_TARGET:-}" ]]; then
    log "TELEGRAM_TARGET missing; cannot send daily brief"
    return 1
  fi

  "$OPENCLAW_BIN" message send --channel telegram --target "$TELEGRAM_TARGET" --message "$body"
}

main() {
  init_db
  local cal_json message
  cal_json="$(fetch_calendar_json)"
  message="$(compose_message "$cal_json")"
  send_message "$message"
  log "Daily brief complete."
}

main "$@"
