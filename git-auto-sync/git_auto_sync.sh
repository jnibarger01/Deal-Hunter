#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/jace/.openclaw/workspace}"
BRANCH="${BRANCH:-}"
REMOTE="${REMOTE:-origin}"
TELEGRAM_TARGET="${TELEGRAM_TARGET:-}"
TAG_PREFIX="${TAG_PREFIX:-auto-sync}"

alert() {
  local msg="$1"
  echo "[git-auto-sync] $msg" >&2
  if [[ -n "$TELEGRAM_TARGET" ]] && command -v openclaw >/dev/null 2>&1; then
    openclaw message send --channel telegram --target "$TELEGRAM_TARGET" --message "⚠️ Git auto-sync alert on $(hostname): $msg" >/dev/null 2>&1 || true
  fi
}

on_error() {
  alert "failed at line $1 (exit $2)"
}
trap 'on_error ${LINENO} $?' ERR

if ! command -v git >/dev/null 2>&1; then
  alert "git not found"
  exit 1
fi

if [[ ! -d "$REPO_DIR/.git" ]]; then
  alert "not a git repo: $REPO_DIR"
  exit 1
fi

cd "$REPO_DIR"

if [[ -z "$BRANCH" ]]; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
fi

if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  alert "remote '$REMOTE' not configured"
  exit 1
fi

# keep index clean state before operations
if ! git diff --quiet --ignore-submodules --cached; then
  :
fi

# Stage and commit all current workspace changes
if [[ -n "$(git status --porcelain)" ]]; then
  git add -A
  if ! git diff --cached --quiet; then
    stamp=$(date +"%Y-%m-%d %H:%M:%S %z")
    git commit -m "auto-sync: ${stamp}"
  fi
fi

# Sync remote changes safely and detect conflicts

git fetch "$REMOTE" "$BRANCH"

if git rev-parse --verify -q "$REMOTE/$BRANCH" >/dev/null; then
  # Rebase local branch on latest remote. Abort + alert on conflicts.
  if ! git rebase "$REMOTE/$BRANCH"; then
    git rebase --abort || true
    alert "merge/rebase conflict on $BRANCH. Manual resolution required."
    exit 2
  fi
fi

# Timestamp tag for each sync
sync_ts=$(date +"%Y%m%d-%H%M%S")
tag_name="${TAG_PREFIX}-${sync_ts}"
git tag -a "$tag_name" -m "Automated sync ${sync_ts}" || true

# Push branch and tags
if ! git push "$REMOTE" "$BRANCH"; then
  alert "push failed for $REMOTE/$BRANCH"
  exit 3
fi

if ! git push "$REMOTE" --tags; then
  alert "tag push failed"
  exit 4
fi

echo "[git-auto-sync] success: ${BRANCH} -> ${REMOTE}, tag=${tag_name}"
