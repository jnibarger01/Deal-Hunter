# SQLite Hourly Backup to Google Drive (Encrypted)

This setup does:
- Auto-discovers all SQLite DB files in your project every run (`*.db`, `*.sqlite`, `*.sqlite3`)
- Bundles them into a tar.gz archive
- Encrypts the archive with AES-256 (`openssl`)
- Uploads to Google Drive with rolling retention slots
- Keeps last **7** backups (default; configurable)
- Alerts via Telegram immediately on failure
- Includes full restore script

## Files
- `backup_db_to_drive.sh` — backup + encrypt + upload + alert
- `restore_db_backup.sh` — decrypt + restore

## 1) Prereqs
- `gog` configured and authenticated for Drive
- `openssl`, `tar`, `python3`
- Optional Telegram alert: `openclaw` CLI installed and Telegram connected

## 2) Environment Variables
Set these before running:

```bash
export PROJECT_DIR="/path/to/your/project"
export BACKUP_PASSPHRASE="choose-a-strong-passphrase"
export DRIVE_FOLDER_ID="your_google_drive_folder_id"
export GOG_ACCOUNT="jnibarger01@gmail.com"      # optional if default account already set
export RETENTION_COUNT="7"                        # defaults to 7
export TELEGRAM_TARGET="8593378188"              # optional, for failure alerts
```

## 3) Manual Test
```bash
chmod +x backup_db_to_drive.sh restore_db_backup.sh
./backup_db_to_drive.sh
```

## 4) Hourly Cron
```bash
crontab -e
```
Add:
```cron
0 * * * * PROJECT_DIR="/path/to/your/project" BACKUP_PASSPHRASE="your-passphrase" DRIVE_FOLDER_ID="your-folder-id" GOG_ACCOUNT="jnibarger01@gmail.com" TELEGRAM_TARGET="8593378188" /home/jace/.openclaw/workspace/db-backup/backup_db_to_drive.sh >> /home/jace/.local/share/db-backups/backup.log 2>&1
```

## 5) Restore
1. Download one backup file from Drive (example: `sqlite-backup-slot3.enc`)
2. Run:
```bash
export BACKUP_PASSPHRASE="your-passphrase"
/home/jace/.openclaw/workspace/db-backup/restore_db_backup.sh /path/to/sqlite-backup-slot3.enc /tmp/db-restore
```
3. Restored DB files are under:
- `/tmp/db-restore/data/...`
- Manifest under `/tmp/db-restore/meta/...`

## Notes
- Retention is implemented as rolling slots (`slot0..slot6`) on Drive.
- New databases are auto-discovered each run (no manual config).
- If no DB files are found, backup fails and (if configured) sends Telegram alert.
