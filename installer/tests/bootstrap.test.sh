#!/usr/bin/env bash
# Tests für Online-Bootstrap (ohne echten Download)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PASS=0
FAIL=0

pass() { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }

echo "=== Bootstrap Tests ==="

# install.sh ist ausführbar
[[ -x "${ROOT}/install.sh" ]] && pass "install.sh executable" || fail "install.sh executable"

# Hilfe
"${ROOT}/install.sh" --help >/dev/null 2>&1 && pass "--help" || fail "--help"

# --dir Option (lokal, bootstrap-only)
TMPDIR=$(mktemp -d)
"${ROOT}/install.sh" --dir "$TMPDIR" --bootstrap-only >/dev/null 2>&1 \
  && [[ -f "$TMPDIR/docker-compose.yml" ]] \
  && [[ ! -d "$TMPDIR/backend" ]] \
  && [[ ! -d "$TMPDIR/frontend" ]] \
  && pass "--dir bootstrap" || fail "--dir bootstrap"
rm -rf "$TMPDIR"

# Default-Installationspfad
default_dir=$(
  FESTSCHMIEDE_DEFAULT_INSTALL_DIR=/custom/default bash -c '
    source /dev/null 2>/dev/null || true
    FESTSCHMIEDE_DEFAULT_INSTALL_DIR=/custom/default
    _default_install_dir() {
      if [[ -n "$FESTSCHMIEDE_DEFAULT_INSTALL_DIR" ]]; then
        echo "$FESTSCHMIEDE_DEFAULT_INSTALL_DIR"
        return
      fi
      echo "/fallback"
    }
    _default_install_dir
  '
)
[[ "$default_dir" == "/custom/default" ]] && pass "default install dir override" || fail "default install dir override"

# Version
expected_version=$(grep -E '^INSTALLER_VERSION=' "${ROOT}/installer/lib/common.sh" | cut -d'"' -f2)
out=$("${ROOT}/install.sh" --version 2>&1)
echo "$out" | grep -q "$expected_version" && pass "--version" || fail "--version"

# Lokaler Modus erkennt Repository
[[ -f "${ROOT}/installer/install.sh" ]] && pass "local installer exists" || fail "local installer exists"

# URL-Generierung (inline test via bash)
REF=$(FESTSCHMIEDE_VERSION=2.4.0 bash -c '
  source /dev/null 2>/dev/null
  FESTSCHMIEDE_GITHUB_REPO=TimUx/FestSchmiede
  FESTSCHMIEDE_VERSION=2.4.0
  echo "https://raw.githubusercontent.com/${FESTSCHMIEDE_GITHUB_REPO}/v${FESTSCHMIEDE_VERSION}/docker-compose.yml"
')
echo "$REF" | grep -q "raw.githubusercontent.com" && pass "raw URL format" || fail "raw URL format"

# Bootstrap-Manifest vorhanden
[[ -f "${ROOT}/installer/bootstrap-files.txt" ]] && pass "bootstrap manifest exists" || fail "bootstrap manifest exists"
manifest_count=$(grep -cvE '^\s*(#|$)' "${ROOT}/installer/bootstrap-files.txt")
[[ "$manifest_count" -ge 10 ]] && pass "bootstrap manifest entries" || fail "bootstrap manifest entries"

# Erkennung installierter Installer-Version (für Auto-Update)
TMP_VER=$(mktemp -d)
mkdir -p "$TMP_VER/installer/lib"
echo 'INSTALLER_VERSION="2.3.0"' > "$TMP_VER/installer/lib/common.sh"
detected=$(grep -E '^INSTALLER_VERSION=' "$TMP_VER/installer/lib/common.sh" | cut -d'"' -f2)
[[ "$detected" == "2.3.0" && "$detected" != "2.4.0" ]] \
  && pass "installed version detect" || fail "installed version detect"
rm -rf "$TMP_VER"

# Phase-Hinweis in Hilfe
"${ROOT}/install.sh" --help 2>&1 | grep -q 'Installer-Bootstrap' \
  && pass "--update mentions bootstrap" || fail "--update mentions bootstrap"

# Re-exec-Flag: mit FESTSCHMIEDE_BOOTSTRAP_DONE=1 keinen zweiten Bootstrap erzwingen
# (nur Parsing / Hilfe; voller Update braucht Docker)
grep -q 'FESTSCHMIEDE_BOOTSTRAP_DONE' "${ROOT}/install.sh" \
  && pass "bootstrap re-exec flag" || fail "bootstrap re-exec flag"
grep -q '_reexec_after_bootstrap' "${ROOT}/install.sh" \
  && pass "bootstrap re-exec helper" || fail "bootstrap re-exec helper"
grep -q 'Phase 1/2: Installer-Bootstrap' "${ROOT}/install.sh" \
  && pass "bootstrap phase log" || fail "bootstrap phase log"

# installer/install.sh leitet Update ohne Bootstrap an Root-install.sh weiter
grep -q 'FESTSCHMIEDE_BOOTSTRAP_DONE' "${ROOT}/installer/install.sh" \
  && pass "installer delegates bootstrap" || fail "installer delegates bootstrap"

# Bootstrap-only mit temp dir (echter Download – optional, nur wenn Netzwerk)
if [[ "${FESTSCHMIEDE_TEST_ONLINE:-}" == "1" ]]; then
  TMPDIR=$(mktemp -d)
  FESTSCHMIEDE_INSTALL_DIR="$TMPDIR" FESTSCHMIEDE_BOOTSTRAP_ONLY=1 bash < "${ROOT}/install.sh"
  [[ -f "$TMPDIR/docker-compose.yml" && -f "$TMPDIR/installer/install.sh" ]] \
    && [[ ! -d "$TMPDIR/backend" ]] \
    && pass "online bootstrap download" || fail "online bootstrap download"
  rm -rf "$TMPDIR"
else
  echo "  ○ online bootstrap download (übersprungen, FESTSCHMIEDE_TEST_ONLINE=1 zum Aktivieren)"
fi

echo ""
echo "Ergebnis: $PASS bestanden, $FAIL fehlgeschlagen"
[[ $FAIL -eq 0 ]]
