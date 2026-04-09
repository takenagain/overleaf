#!/usr/bin/env bash
# sync-upstream.sh
# Syncs the fork's main and staging branches with upstream overleaf/overleaf.
# Only runs if there are new commits in upstream/main.
# Usage: ./bin/sync-upstream.sh

set -euo pipefail

UPSTREAM_URL="https://github.com/overleaf/overleaf.git"
UPSTREAM_REMOTE="upstream"
ORIGIN_REMOTE="origin"
MAIN_BRANCH="main"
STAGING_BRANCH="staging"

# Ensure we're in the repo root
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: Uncommitted changes detected. Please commit or stash them before syncing." >&2
  exit 1
fi

# Check that upstream remote exists; create it if not
if ! git remote get-url "$UPSTREAM_REMOTE" &>/dev/null; then
  echo "Adding '$UPSTREAM_REMOTE' remote -> $UPSTREAM_URL"
  git remote add "$UPSTREAM_REMOTE" "$UPSTREAM_URL"
fi

echo "Fetching from $UPSTREAM_REMOTE..."
git fetch "$UPSTREAM_REMOTE"

# Resolve current upstream/main commit and local main commit
UPSTREAM_SHA="$(git rev-parse "$UPSTREAM_REMOTE/$MAIN_BRANCH")"
LOCAL_MAIN_SHA="$(git rev-parse "$MAIN_BRANCH")"

if [ "$UPSTREAM_SHA" = "$LOCAL_MAIN_SHA" ]; then
  echo "No new commits in upstream/$MAIN_BRANCH. Nothing to do."
  exit 0
fi

echo "Upstream has new commits. Syncing..."

ORIGINAL_BRANCH="$(git symbolic-ref --short HEAD)"

# Sync main
git checkout "$MAIN_BRANCH"
git merge --ff-only "$UPSTREAM_REMOTE/$MAIN_BRANCH"

# Merge main -> staging
git checkout "$STAGING_BRANCH"
git merge "$MAIN_BRANCH" --no-edit

# Push both branches to origin
git push "$ORIGIN_REMOTE" "$MAIN_BRANCH"
git push "$ORIGIN_REMOTE" "$STAGING_BRANCH"

# Return to original branch
git checkout "$ORIGINAL_BRANCH"

echo "Done. Synced $MAIN_BRANCH and $STAGING_BRANCH with upstream."
