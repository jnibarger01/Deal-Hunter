# Git Auto-Sync (Hourly)

What this setup does:
- Commits all workspace changes hourly
- Fetches + rebases on remote branch
- Detects merge conflicts and alerts (no forced resolution)
- Tags each successful sync with timestamp
- Pushes branch + tags to remote
- Pre-commit hook blocks sensitive data leaks

## Files
- `git_auto_sync.sh` — main sync script
- `install_hourly_cron.sh` — installs hourly cron entry
- `.env.example` — environment template
- `.git/hooks/pre-commit` — secret prevention hook

## 1) Configure
```bash
cp /home/jace/.openclaw/workspace/git-auto-sync/.env.example /home/jace/.openclaw/workspace/git-auto-sync/.env
# Edit values as needed
```

## 2) Install hourly cron
```bash
bash /home/jace/.openclaw/workspace/git-auto-sync/install_hourly_cron.sh
```

## 3) Run once manually
```bash
source /home/jace/.openclaw/workspace/git-auto-sync/.env
bash /home/jace/.openclaw/workspace/git-auto-sync/git_auto_sync.sh
```

## Merge conflict behavior
If rebase detects a conflict, script aborts and sends a Telegram alert (if `TELEGRAM_TARGET` is set).
No auto-force / no destructive conflict resolution.

## Tags
Each successful run creates:
- `auto-sync-YYYYMMDD-HHMMSS`
