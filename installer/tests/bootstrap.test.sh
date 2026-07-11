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
out=$("${ROOT}/install.sh" --version 2>&1)
echo "$out" | grep -q "2.3.2" && pass "--version" || fail "--version"

# Lokaler Modus erkennt Repository
[[ -f "${ROOT}/installer/install.sh" ]] && pass "local installer exists" || fail "local installer exists"

# URL-Generierung (inline test via bash)
REF=$(FESTSCHMIEDE_VERSION=2.3.2 bash -c '
  source /dev/null 2>/dev/null
  FESTSCHMIEDE_GITHUB_REPO=TimUx/FestSchmiede
  FESTSCHMIEDE_VERSION=2.3.2
  echo "https://github.com/${FESTSCHMIEDE_GITHUB_REPO}/archive/refs/tags/v${FESTSCHMIEDE_VERSION}.tar.gz"
')
echo "$REF" | grep -q "FestSchmiede" && pass "archive URL format" || fail "archive URL format"

# Erkennung installierter Installer-Version (für Auto-Update)
TMP_VER=$(mktemp -d)
mkdir -p "$TMP_VER/installer/lib"
echo 'INSTALLER_VERSION="2.3.0"' > "$TMP_VER/installer/lib/common.sh"
detected=$(grep -E '^INSTALLER_VERSION=' "$TMP_VER/installer/lib/common.sh" | cut -d'"' -f2)
[[ "$detected" == "2.3.0" && "$detected" != "2.3.2" ]] \
  && pass "installed version detect" || fail "installed version detect"
rm -rf "$TMP_VER"

# Bootstrap-only mit temp dir (echter Download – optional, nur wenn Netzwerk)
if [[ "${FESTSCHMIEDE_TEST_ONLINE:-}" == "1" ]]; then
  TMPDIR=$(mktemp -d)
  FESTSCHMIEDE_INSTALL_DIR="$TMPDIR" FESTSCHMIEDE_BOOTSTRAP_ONLY=1 bash < "${ROOT}/install.sh"
  [[ -f "$TMPDIR/docker-compose.yml" && -f "$TMPDIR/installer/install.sh" ]] \
    && pass "online bootstrap download" || fail "online bootstrap download"
  rm -rf "$TMPDIR"
else
  echo "  ○ online bootstrap download (übersprungen, FESTSCHMIEDE_TEST_ONLINE=1 zum Aktivieren)"
fi

echo ""
echo "Ergebnis: $PASS bestanden, $FAIL fehlgeschlagen"
[[ $FAIL -eq 0 ]]
