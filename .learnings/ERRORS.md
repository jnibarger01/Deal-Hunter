## [ERR-20260302-002] git-auto-sync-github-auth

**Logged**: 2026-03-02T12:36:00Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Auto-sync push to GitHub failed due to missing git authentication credentials.

### Error
```
remote: Invalid username or token. Password authentication is not supported for Git operations.
fatal: Authentication failed for 'https://github.com/jnibarger01/deal-hunter.git/'
```

### Context
- Configured origin to https://github.com/jnibarger01/deal-hunter.git
- Auto-sync script committed locally, then failed at push.

### Suggested Fix
Configure GitHub auth (gh auth login or PAT credential helper), then rerun sync.

### Metadata
- Reproducible: yes
- Related Files: /home/jace/.openclaw/workspace/git-auto-sync/git_auto_sync.sh

---
