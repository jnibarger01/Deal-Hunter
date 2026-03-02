# Ops Automation

Implements:
- **#11 Daily Briefing**: one consolidated Telegram message at 07:00 local.
- **#3 Urgent Email Detection**: every 30 min in waking windows, with noise filtering + feedback learning.

## Files

- `daily_brief.sh`
- `urgent_email_scan.sh`
- `urgent_feedback.sh`
- `config/.env.example`
- `rules/noise_senders.txt`
- `state/` (SQLite state + runtime files)
- `install_timers.sh`
- `systemd/*.service` and `systemd/*.timer`

## Setup

1. Copy and configure env:
   ```bash
   cd ~/.openclaw/workspace/ops-automation
   cp config/.env.example config/.env
   $EDITOR config/.env
   ```

2. Required env vars in `config/.env`:
   - `TELEGRAM_TARGET` (Telegram chat id or target accepted by `openclaw message send`)
   - `DRY_RUN` (`1` for no sends, `0` for live sends)

3. Optional overrides:
   - `GOG_GMAIL_CMD` default: `gog gmail list --format json`
   - `GOG_CAL_CMD` default: `gog calendar today --format json`
   - `URGENT_THRESHOLD` default: `7.0`
   - `LOOKBACK_HOURS` default: `36`

4. Mark scripts executable:
   ```bash
   chmod +x daily_brief.sh urgent_email_scan.sh urgent_feedback.sh install_timers.sh
   ```

## gog Auth Prerequisite

If `gog` cannot fetch Gmail/Calendar yet, run auth first (exact command):

```bash
gog auth login
```

If your local gog uses different auth subcommands, run and follow your local help:

```bash
gog --help
```

Then update `GOG_GMAIL_CMD` / `GOG_CAL_CMD` in `.env` if your gog command shape differs.

## Dry Test

```bash
DRY_RUN=1 ./urgent_email_scan.sh
DRY_RUN=1 ./daily_brief.sh
```

## Install scheduler (systemd user timers)

```bash
./install_timers.sh
```

This installs and enables:
- `daily-brief.timer` -> 07:00 daily
- `urgent-email-scan.timer` -> every 30 minutes in:
  - Weekdays: 17:00–21:00
  - Weekends: 07:00–21:00

## Feedback loop

When you get an urgent alert containing `Message ID`, provide correction:

```bash
./urgent_feedback.sh <message_id> urgent
./urgent_feedback.sh <message_id> not-urgent
```

This updates:
- sender weights (`sender_weights`)
- keyword weights (`keyword_weights`)
- urgent event status (`confirmed` / `dismissed`)

## Storage / state

SQLite DB: `state/automation.db`
Main tables:
- `processed_messages`
- `urgent_events`
- `contact_context`
- `sender_weights`
- `keyword_weights`

## Cron fallback (if systemd user unavailable)

Add manually with `crontab -e`:

```cron
0 7 * * * cd ~/.openclaw/workspace/ops-automation && ./daily_brief.sh
*/30 17-21 * * 1-5 cd ~/.openclaw/workspace/ops-automation && ./urgent_email_scan.sh
*/30 7-21 * * 6,0 cd ~/.openclaw/workspace/ops-automation && ./urgent_email_scan.sh
```
