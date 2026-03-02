#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/config/.env"
[[ -f "$ENV_FILE" ]] || ENV_FILE="$SCRIPT_DIR/config/.env.example"
# shellcheck disable=SC1090
source "$ENV_FILE"

STATE_DIR="${STATE_DIR:-$SCRIPT_DIR/state}"
NOISE_SENDERS_FILE="${NOISE_SENDERS_FILE:-$SCRIPT_DIR/rules/noise_senders.txt}"
DB_PATH="${DB_PATH:-$STATE_DIR/automation.db}"
OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"
DRY_RUN="${DRY_RUN:-1}"
URGENT_THRESHOLD="${URGENT_THRESHOLD:-7.0}"
LOOKBACK_HOURS="${LOOKBACK_HOURS:-36}"
GOG_GMAIL_CMD="${GOG_GMAIL_CMD:-gog gmail list --format json}"

mkdir -p "$STATE_DIR"

log() { printf '[urgent-scan] %s\n' "$*"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { log "Missing dependency: $1"; exit 1; }
}

require_cmd python3
require_cmd sqlite3

init_db() {
  sqlite3 "$DB_PATH" <<'SQL'
CREATE TABLE IF NOT EXISTS sender_weights (
  sender TEXT PRIMARY KEY,
  weight REAL NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS keyword_weights (
  keyword TEXT PRIMARY KEY,
  weight REAL NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS processed_messages (
  msg_id TEXT PRIMARY KEY,
  processed_ts TEXT DEFAULT CURRENT_TIMESTAMP,
  sender TEXT,
  subject TEXT,
  score REAL,
  classified_urgent INTEGER
);
CREATE TABLE IF NOT EXISTS urgent_events (
  msg_id TEXT PRIMARY KEY,
  sender TEXT,
  subject TEXT,
  score REAL,
  ts TEXT,
  status TEXT DEFAULT 'open'
);
CREATE TABLE IF NOT EXISTS contact_context (
  email TEXT PRIMARY KEY,
  interaction_count INTEGER NOT NULL DEFAULT 0,
  urgent_count INTEGER NOT NULL DEFAULT 0,
  last_subject TEXT,
  last_ts TEXT
);
SQL
}

waking_hours_ok() {
  local dow hour
  dow="$(date +%u)"   # 1=Mon..7=Sun
  hour="$(date +%H)"
  if (( dow <= 5 )); then
    (( hour >= 17 && hour <= 21 ))
  else
    (( hour >= 7 && hour <= 21 ))
  fi
}

fetch_emails_json() {
  if ! command -v gog >/dev/null 2>&1; then
    log "gog CLI not found. Returning empty set."
    echo '[]'
    return 0
  fi

  local out rc
  set +e
  out="$(bash -lc "$GOG_GMAIL_CMD" 2>&1)"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]]; then
    log "Gmail fetch failed. Command: $GOG_GMAIL_CMD"
    log "Error: $out"
    log "Auth/setup likely required. Try: gog auth login"
    echo '[]'
    return 0
  fi

  # Accept either raw array/object JSON or lines with JSON embedded.
  if echo "$out" | python3 -c 'import json,sys; json.loads(sys.stdin.read()); print("ok")' >/dev/null 2>&1; then
    echo "$out"
  else
    # Try to extract first JSON block
    echo "$out" | python3 - <<'PY'
import json,re,sys
text=sys.stdin.read()
m=re.search(r'(\[.*\]|\{.*\})', text, re.S)
if not m:
    print('[]')
    raise SystemExit
cand=m.group(1)
try:
    obj=json.loads(cand)
    print(json.dumps(obj))
except Exception:
    print('[]')
PY
  fi
}

build_candidates() {
  local raw_json="$1"
  python3 - "$raw_json" "$NOISE_SENDERS_FILE" "$DB_PATH" "$URGENT_THRESHOLD" "$LOOKBACK_HOURS" <<'PY'
import datetime as dt, json, re, sqlite3, sys

raw = sys.argv[1]
noise_file = sys.argv[2]
db = sys.argv[3]
threshold = float(sys.argv[4])
lookback_h = int(float(sys.argv[5]))

try:
    payload = json.loads(raw)
except Exception:
    payload = []

if isinstance(payload, dict):
    for key in ("messages","emails","items","data"):
        if isinstance(payload.get(key), list):
            payload = payload[key]
            break
    else:
        payload = [payload]

noise=[]
try:
    with open(noise_file,'r',encoding='utf-8') as f:
        for line in f:
            line=line.strip().lower()
            if line and not line.startswith('#'):
                noise.append(line)
except FileNotFoundError:
    pass

con = sqlite3.connect(db)
con.row_factory = sqlite3.Row
sender_weights = {r['sender']: float(r['weight']) for r in con.execute('select sender,weight from sender_weights')}
keyword_weights = {r['keyword']: float(r['weight']) for r in con.execute('select keyword,weight from keyword_weights')}
seen = {r['msg_id'] for r in con.execute('select msg_id from processed_messages')}

urgent_terms = {
    'urgent': 2.5, 'asap': 2.0, 'immediately': 2.0, 'today': 1.0,
    'deadline': 2.0, 'blocked': 2.0, 'failure': 2.0, 'outage': 3.0,
    'payment due': 2.0, 'invoice overdue': 2.0, 'security': 2.0,
    'prod': 1.5, 'production': 1.5, 'escalation': 2.5,
}

now = dt.datetime.now(dt.timezone.utc)
cutoff = now - dt.timedelta(hours=lookback_h)


def parse_sender(v):
    if not v:
        return ''
    m=re.search(r'<([^>]+)>', str(v))
    return (m.group(1) if m else str(v)).strip().lower()

def parse_ts(v):
    if not v:
        return None
    s=str(v).strip()
    for fmt in ('%Y-%m-%dT%H:%M:%S%z','%Y-%m-%dT%H:%M:%S.%f%z','%Y-%m-%d %H:%M:%S','%Y-%m-%d'):
        try:
            t=dt.datetime.strptime(s,fmt)
            if t.tzinfo is None:
                t=t.replace(tzinfo=dt.timezone.utc)
            return t
        except Exception:
            pass
    try:
        t=dt.datetime.fromisoformat(s.replace('Z','+00:00'))
        if t.tzinfo is None:
            t=t.replace(tzinfo=dt.timezone.utc)
        return t
    except Exception:
        return None

out=[]
for item in payload if isinstance(payload,list) else []:
    if not isinstance(item,dict):
        continue
    msg_id=str(item.get('id') or item.get('messageId') or item.get('threadId') or '').strip()
    if not msg_id or msg_id in seen:
        continue
    sender=parse_sender(item.get('from') or item.get('sender') or item.get('author'))
    subject=(item.get('subject') or '').strip()
    snippet=(item.get('snippet') or item.get('bodyPreview') or item.get('summary') or '').strip()
    ts_raw=item.get('date') or item.get('internalDate') or item.get('timestamp') or item.get('receivedAt')
    ts=parse_ts(ts_raw)
    if ts and ts < cutoff:
        continue

    sender_l=sender.lower()
    if any(n in sender_l for n in noise):
        continue

    text=(subject + ' ' + snippet).lower()
    score=0.0
    score += sender_weights.get(sender_l,0.0)

    for k,v in urgent_terms.items():
        if k in text:
            score += v
    for k,v in keyword_weights.items():
        if k and k.lower() in text:
            score += float(v)

    if re.search(r'\b(re:|fwd:)\b', subject.lower()):
        score += 0.5
    if sender_l.endswith(('.gov','.edu')):
        score += 0.5

    urgent = 1 if score >= threshold else 0
    out.append({
        'msg_id': msg_id,
        'sender': sender,
        'subject': subject,
        'snippet': snippet,
        'ts': (ts.isoformat() if ts else ''),
        'score': round(score,2),
        'urgent': urgent,
    })

print(json.dumps(out))
PY
}

persist_and_alert() {
  local candidate_json="$1"
  python3 - "$candidate_json" "$DB_PATH" "$DRY_RUN" "$OPENCLAW_BIN" "$TELEGRAM_TARGET" <<'PY'
import json,sqlite3,subprocess,sys

rows = json.loads(sys.argv[1]) if sys.argv[1] else []
db = sys.argv[2]
dry = str(sys.argv[3]) == '1'
openclaw_bin = sys.argv[4]
target = sys.argv[5]

con = sqlite3.connect(db)
cur = con.cursor()
alerts=[]

for r in rows:
    cur.execute(
        "insert or ignore into processed_messages(msg_id,sender,subject,score,classified_urgent) values(?,?,?,?,?)",
        (r['msg_id'], r['sender'], r['subject'], r['score'], r['urgent'])
    )
    if cur.rowcount:
        cur.execute(
            "insert into contact_context(email,interaction_count,urgent_count,last_subject,last_ts) values(?,?,?,?,?) "
            "on conflict(email) do update set interaction_count=interaction_count+1, urgent_count=urgent_count+excluded.urgent_count, last_subject=excluded.last_subject,last_ts=excluded.last_ts",
            (r['sender'],1,r['urgent'],r['subject'],r['ts'])
        )

    if r['urgent'] == 1:
        cur.execute(
            "insert or ignore into urgent_events(msg_id,sender,subject,score,ts,status) values(?,?,?,?,?, 'open')",
            (r['msg_id'], r['sender'], r['subject'], r['score'], r['ts'])
        )
        if cur.rowcount:
            alerts.append(r)

con.commit()

if not alerts:
    print("NO_ALERTS")
    raise SystemExit

for a in alerts:
    body=(
        "🚨 Urgent email detected\n"
        f"From: {a['sender']}\n"
        f"Subject: {a['subject'] or '(no subject)'}\n"
        f"Score: {a['score']}\n"
        f"Message ID: {a['msg_id']}\n"
        "Feedback: urgent_feedback.sh <msg_id> urgent|not-urgent"
    )
    if dry:
        print("DRY_ALERT:\n"+body)
    else:
        if not target:
            print("ERROR: TELEGRAM_TARGET not set; cannot send alert")
            continue
        cmd=[openclaw_bin,'message','send','--channel','telegram','--target',target,'--message',body]
        subprocess.run(cmd,check=False)
        print("SENT:"+a['msg_id'])
PY
}

main() {
  init_db

  if [[ "${FORCE_RUN:-0}" != "1" ]] && ! waking_hours_ok; then
    log "Outside configured waking hours. Exiting."
    exit 0
  fi

  local raw candidates
  raw="$(fetch_emails_json)"
  candidates="$(build_candidates "$raw")"
  persist_and_alert "$candidates"
  log "Scan complete."
}

main "$@"
