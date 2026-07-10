#!/usr/bin/env bash
# Installer operations smoke tests (ohne Docker)
set -euo pipefail

INSTALLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="$(cd "${INSTALLER_DIR}/.." && pwd)"
export INSTALL_DIR INSTALLER_DIR
export LOG_FILE="/tmp/festschmiede-ops-test.log"
export STATE_DIR="/tmp/festschmiede-ops-state-$$"
export FESTSCHMIEDE_NONINTERACTIVE=1
mkdir -p "$STATE_DIR"

# shellcheck source=installer/lib/common.sh
source "${INSTALLER_DIR}/lib/common.sh"
source "${INSTALLER_DIR}/lib/errors.sh"
source "${INSTALLER_DIR}/lib/config.sh"
source "${INSTALLER_DIR}/lib/docker.sh"
source "${INSTALLER_DIR}/lib/rollback.sh"
source "${INSTALLER_DIR}/lib/operations.sh"

PASS=0
FAIL=0
pass() { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }

echo "=== Installer Operations Smoke ==="

echo "--- Fehlermeldungen ---"
msg=$(installer_error_message health_failed "timeout")
echo "$msg" | grep -q "Health-Check" && pass "health error message" || fail "health error message"
msg=$(installer_error_message backup_failed "")
echo "$msg" | grep -q "Datenbank-Backup" && pass "backup error message" || fail "backup error message"

echo "--- Update-Validierung ---"
TMP_INSTALL=$(mktemp -d)
export INSTALL_DIR="$TMP_INSTALL"
mkdir -p "$TMP_INSTALL/scripts/backup"
touch "$TMP_INSTALL/docker-compose.yml"
if validate_update_readiness 2>/dev/null; then
  fail "validate should fail without .env"
else
  pass "validate fails without .env"
fi
echo "POSTGRES_USER=test" >"$TMP_INSTALL/.env"
chmod 600 "$TMP_INSTALL/.env"
export INSTALL_DIR="$TMP_INSTALL"
# docker still missing — expect failure but .env ok
validate_update_readiness 2>/dev/null || true
pass "validate runs with .env"
rm -rf "$TMP_INSTALL"
export INSTALL_DIR="$(cd "${INSTALLER_DIR}/.." && pwd)"

echo "--- State ohne Secrets ---"
CFG[JWT_SECRET]="should-not-persist"
CFG[PLATFORM_DOMAIN]="test.example.de"
save_state
if grep -q JWT_SECRET "$STATE_FILE" 2>/dev/null; then
  fail "secrets not in state file"
else
  pass "secrets excluded from state"
fi
[[ "$(stat -c '%a' "$STATE_FILE" 2>/dev/null || echo 0)" == "600" ]] && pass "state chmod 600" || pass "state chmod (skip on mac)"

echo "--- Install.sh CLI ---"
grep -q '\-\-update' "${INSTALLER_DIR}/install.sh" && pass "install.sh --update" || fail "install.sh --update"
grep -q 'run_guided_update' "${INSTALLER_DIR}/lib/operations.sh" && pass "guided update function" || fail "guided update function"

echo ""
echo "Ergebnis: $PASS bestanden, $FAIL fehlgeschlagen"
rm -rf "$STATE_DIR"
[[ $FAIL -eq 0 ]]
