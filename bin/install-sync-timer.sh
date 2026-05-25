#!/usr/bin/env bash
# bin/install-sync-timer.sh
#
# Installs the overleaf-sync-upstream systemd user timer on this machine.
# Run once from the repository root (or any directory within the repo).
#
# What it does:
#   1. Resolves the repo root and preferred log directory.
#   2. Creates the log directory (with sudo if /var/log/overleaf is needed).
#   3. Stamps the systemd unit templates with real paths and copies them to
#      ~/.config/systemd/user/.
#   4. Reloads the systemd user daemon, enables, and starts the timer.
#
# Usage:
#   bash bin/install-sync-timer.sh [--uninstall]

set -euo pipefail

UNIT_NAME="overleaf-sync-upstream"
REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
SYSTEMD_USER_DIR="${HOME}/.config/systemd/user"
TEMPLATE_DIR="${REPO_ROOT}/systemd"
SCRIPT="${REPO_ROOT}/bin/sync-upstream.sh"

# ── Resolve log directory ─────────────────────────────────────────────────────
_resolve_log_dir() {
  local system_dir="/var/log/overleaf"
  local user_dir="${HOME}/.local/log/overleaf"

  if [[ -d "$system_dir" && -w "$system_dir" ]]; then
    echo "$system_dir"
  elif mkdir -p "$system_dir" 2>/dev/null && [[ -w "$system_dir" ]]; then
    echo "$system_dir"
  elif sudo mkdir -p "$system_dir" 2>/dev/null && sudo chown "$(id -u):$(id -g)" "$system_dir" 2>/dev/null; then
    echo "$system_dir"
  else
    mkdir -p "$user_dir"
    echo "$user_dir"
  fi
}

# ── Uninstall path ────────────────────────────────────────────────────────────
uninstall() {
  echo "Stopping and disabling ${UNIT_NAME}.timer..."
  systemctl --user stop "${UNIT_NAME}.timer"  2>/dev/null || true
  systemctl --user disable "${UNIT_NAME}.timer" 2>/dev/null || true
  rm -f "${SYSTEMD_USER_DIR}/${UNIT_NAME}.service" \
        "${SYSTEMD_USER_DIR}/${UNIT_NAME}.timer"
  systemctl --user daemon-reload
  echo "Uninstalled."
}

if [[ "${1:-}" == "--uninstall" ]]; then
  uninstall
  exit 0
fi

# ── Install ───────────────────────────────────────────────────────────────────
echo "==> Repo root   : ${REPO_ROOT}"

LOG_DIR="$(_resolve_log_dir)"
echo "==> Log dir     : ${LOG_DIR}"
echo "==> Unit dir    : ${SYSTEMD_USER_DIR}"

# Ensure script is executable
chmod +x "$SCRIPT"

mkdir -p "$SYSTEMD_USER_DIR"

# Stamp templates with concrete paths
for unit in service timer; do
  template="${TEMPLATE_DIR}/${UNIT_NAME}.${unit}"
  dest="${SYSTEMD_USER_DIR}/${UNIT_NAME}.${unit}"

  if [[ ! -f "$template" ]]; then
    echo "ERROR: template not found: ${template}" >&2
    exit 1
  fi

  sed \
    -e "s|__REPO_ROOT__|${REPO_ROOT}|g" \
    -e "s|__LOG_DIR__|${LOG_DIR}|g" \
    "$template" > "$dest"

  echo "==> Installed   : ${dest}"
done

# Reload daemon and enable timer
systemctl --user daemon-reload
systemctl --user enable "${UNIT_NAME}.timer"
systemctl --user start  "${UNIT_NAME}.timer"

echo ""
echo "✓ Timer installed and started."
echo ""
echo "Useful commands:"
echo "  systemctl --user status  ${UNIT_NAME}.timer"
echo "  systemctl --user list-timers --all"
echo "  journalctl --user -u ${UNIT_NAME}.service -f"
echo "  tail -f ${LOG_DIR}/sync-upstream.log"
echo ""
echo "To run immediately (e.g. for testing):"
echo "  systemctl --user start ${UNIT_NAME}.service"
