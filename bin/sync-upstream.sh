#!/usr/bin/env bash
# bin/sync-upstream.sh
#
# Syncs the fork's main and staging branches with upstream overleaf/overleaf.
# Only performs a sync when upstream/main has new commits; otherwise records a
# "nothing to sync" entry in the log and exits cleanly.
#
# Log location (in order of preference):
#   1. $SYNC_LOG_FILE   – explicit override via env var
#   2. /var/log/overleaf/sync-upstream.log
#   3. $HOME/.local/log/overleaf/sync-upstream.log  (fallback when /var/log is not writable)
#
# Usage:
#   ./bin/sync-upstream.sh
#   SYNC_LOG_FILE=/tmp/test.log ./bin/sync-upstream.sh

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────
UPSTREAM_URL="https://github.com/overleaf/overleaf.git"
UPSTREAM_REMOTE="upstream"
ORIGIN_REMOTE="origin"
MAIN_BRANCH="main"
STAGING_BRANCH="staging"

# ── Log-file resolution ───────────────────────────────────────────────────────
_resolve_log_file() {
  if [[ -n "${SYNC_LOG_FILE:-}" ]]; then
    echo "$SYNC_LOG_FILE"
    return
  fi

  local system_log_dir="/var/log/overleaf"
  local user_log_dir="${HOME}/.local/log/overleaf"

  if [[ -d "$system_log_dir" && -w "$system_log_dir" ]]; then
    echo "${system_log_dir}/sync-upstream.log"
  elif mkdir -p "$system_log_dir" 2>/dev/null && [[ -w "$system_log_dir" ]]; then
    echo "${system_log_dir}/sync-upstream.log"
  else
    mkdir -p "$user_log_dir"
    echo "${user_log_dir}/sync-upstream.log"
  fi
}

LOG_FILE="$(_resolve_log_file)"

# ── Logging helpers ───────────────────────────────────────────────────────────
log() {
  local ts
  ts="$(date '+%Y-%m-%dT%H:%M:%S%z')"
  printf '[%s] %s\n' "$ts" "$*" | tee -a "$LOG_FILE"
}

log_error() {
  log "ERROR: $*"
}

log_sep() {
  printf '%.0s─' {1..72} >> "$LOG_FILE"
  printf '\n' >> "$LOG_FILE"
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  # Ensure we run from the repository root regardless of CWD
  REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
  cd "$REPO_ROOT"

  log_sep
  log "sync-upstream started (repo: ${REPO_ROOT})"
  log "Log file: ${LOG_FILE}"

  # Guard: no uncommitted changes
  if ! git diff --quiet || ! git diff --cached --quiet; then
    log_error "Uncommitted changes detected. Commit or stash them first."
    exit 1
  fi

  # Ensure upstream remote exists
  if ! git remote get-url "$UPSTREAM_REMOTE" &>/dev/null; then
    log "Adding remote '${UPSTREAM_REMOTE}' -> ${UPSTREAM_URL}"
    git remote add "$UPSTREAM_REMOTE" "$UPSTREAM_URL"
  fi

  log "Fetching ${UPSTREAM_REMOTE}/${MAIN_BRANCH}..."
  git fetch "$UPSTREAM_REMOTE" "$MAIN_BRANCH"

  UPSTREAM_SHA="$(git rev-parse "${UPSTREAM_REMOTE}/${MAIN_BRANCH}")"
  LOCAL_MAIN_SHA="$(git rev-parse "${MAIN_BRANCH}")"

  if [[ "$UPSTREAM_SHA" == "$LOCAL_MAIN_SHA" ]]; then
    log "upstream/${MAIN_BRANCH} is already in sync with ${MAIN_BRANCH} (${LOCAL_MAIN_SHA:0:12}). Nothing to sync."
    log "sync-upstream finished (no-op)."
    log_sep
    exit 0
  fi

  NEW_COMMITS="$(git rev-list --count "${LOCAL_MAIN_SHA}..${UPSTREAM_SHA}")"
  log "Upstream has ${NEW_COMMITS} new commit(s) ahead of local ${MAIN_BRANCH}."

  ORIGINAL_BRANCH="$(git symbolic-ref --short HEAD)"

  # ── Sync main ────────────────────────────────────────────────────────────
  log "Checking out ${MAIN_BRANCH}..."
  git checkout "$MAIN_BRANCH"

  log "Fast-forwarding ${MAIN_BRANCH} to ${UPSTREAM_REMOTE}/${MAIN_BRANCH}..."
  git merge --ff-only "${UPSTREAM_REMOTE}/${MAIN_BRANCH}"
  MERGED_SHA="$(git rev-parse HEAD)"
  log "Merged ${MAIN_BRANCH} -> ${MERGED_SHA:0:12}"

  # ── Merge main -> staging ─────────────────────────────────────────────────
  log "Checking out ${STAGING_BRANCH}..."
  git checkout "$STAGING_BRANCH"

  log "Merging ${MAIN_BRANCH} into ${STAGING_BRANCH}..."
  git merge "$MAIN_BRANCH" --no-edit
  STAGING_SHA="$(git rev-parse HEAD)"
  log "Merged ${STAGING_BRANCH} -> ${STAGING_SHA:0:12}"

  # ── Push both branches ────────────────────────────────────────────────────
  log "Pushing ${MAIN_BRANCH} to ${ORIGIN_REMOTE}..."
  git push "$ORIGIN_REMOTE" "$MAIN_BRANCH"

  log "Pushing ${STAGING_BRANCH} to ${ORIGIN_REMOTE}..."
  git push "$ORIGIN_REMOTE" "$STAGING_BRANCH"

  # ── Restore original branch ───────────────────────────────────────────────
  if [[ "$ORIGINAL_BRANCH" != "$MAIN_BRANCH" && "$ORIGINAL_BRANCH" != "$STAGING_BRANCH" ]]; then
    git checkout "$ORIGINAL_BRANCH"
  else
    git checkout "$STAGING_BRANCH"
  fi

  log "sync-upstream finished. Synced ${MAIN_BRANCH} and ${STAGING_BRANCH} with upstream (${NEW_COMMITS} new commit(s))."
  log_sep
}

main "$@"
