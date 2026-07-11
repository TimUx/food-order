#!/usr/bin/env bash
# FestSchmiede Installer – Unit-Tests (ohne interaktive TUI)
set -euo pipefail

INSTALLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="$(cd "${INSTALLER_DIR}/.." && pwd)"
export INSTALL_DIR INSTALLER_DIR
export LOG_FILE="/tmp/festschmiede-installer-test.log"
export STATE_DIR="/tmp/festschmiede-installer-state"

# shellcheck source=installer/lib/common.sh
source "${INSTALLER_DIR}/lib/common.sh"
source "${INSTALLER_DIR}/lib/validate.sh"
source "${INSTALLER_DIR}/lib/secrets.sh"
source "${INSTALLER_DIR}/lib/detect.sh"
source "${INSTALLER_DIR}/lib/config.sh"

PASS=0
FAIL=0

pass() { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }

echo "=== FestSchmiede Installer Tests ==="

echo "--- Validierung ---"
validate_domain "festschmiede.example.de" && pass "domain valid" || fail "domain valid"
validate_domain "not a domain!" && fail "domain invalid" || pass "domain invalid"
validate_email "admin@example.de" && pass "email valid" || fail "email valid"
validate_email "invalid" && fail "email invalid" || pass "email invalid"
validate_port 587 && pass "port valid" || fail "port valid"
validate_port 99999 && fail "port invalid" || pass "port invalid"
validate_secret_length "$(printf 'a%.0s' {1..40})" 32 && pass "secret length" || fail "secret length"

echo "--- Secrets ---"
SECRET=$(generate_secret 48)
[[ ${#SECRET} -eq 48 ]] && pass "secret generated" || fail "secret generated"
generate_all_secrets
[[ -n "${SECRETS[JWT_SECRET]:-}" ]] && pass "JWT secret set" || fail "JWT secret set"
[[ ${#SECRETS[APP_ENCRYPTION_KEY]} -ge 32 ]] && pass "encryption key set" || fail "encryption key set"

echo "--- Erkennung ---"
run_full_detection
[[ -n "${SYS_DETECT[os_id]:-}" ]] && pass "OS detected" || fail "OS detected"
[[ -n "${SYS_DETECT[arch]:-}" ]] && pass "arch detected" || fail "arch detected"

echo "--- Konfiguration ---"
resolved=$(resolve_install_dir_path "~/festschmiede-test")
[[ "$resolved" == "${HOME}/festschmiede-test" ]] && pass "install dir resolve tilde" || fail "install dir resolve tilde"
validate_install_dir "/tmp/festschmiede-test" && pass "install dir validate" || fail "install dir validate"
CFG[INSTALL_PROFILE]="local"
CFG[PLATFORM_DOMAIN]="localhost"
apply_defaults
[[ "${CFG[CORS_ORIGIN]}" == "http://localhost:5173" ]] && pass "local CORS" || fail "local CORS"
CFG[INSTALL_PROFILE]="production"
CFG[PLATFORM_DOMAIN]="fest.example.de"
apply_defaults
[[ "${CFG[MULTI_TENANT_ENABLED]}" == "true" ]] && pass "production multi-tenant" || fail "production multi-tenant"
[[ "${CFG[PLATFORM_WILDCARD_DOMAIN]}" == "*.fest.example.de" ]] && pass "wildcard domain" || fail "wildcard domain"

echo "--- Idempotenz ---"
TMP_ENV=$(mktemp)
echo "POSTGRES_USER=testuser" >"$TMP_ENV"
while IFS='=' read -r k v; do CFG["$k"]="$v"; done <"$TMP_ENV"
[[ "${CFG[POSTGRES_USER]}" == "testuser" ]] && pass "env reload" || fail "env reload"
rm -f "$TMP_ENV"

echo "--- Compose Netzwerke ---"
CFG=()
CFG[USES_REVERSE_PROXY]="no"
CFG[PROXY_MODE]="none"
generate_compose_override
grep -q "festschmiede_internal" "${INSTALL_DIR}/installer/generated/compose.override.yml" \
  && pass "internal network local" || fail "internal network local"
! grep -qE "ports: (\[\]|!reset \[\])" "${INSTALL_DIR}/installer/generated/compose.override.yml" \
  && pass "local keeps host ports" || fail "local keeps host ports"

CFG[USES_REVERSE_PROXY]="yes"
CFG[PROXY_MODE]="existing"
CFG[INSTALL_PROFILE]="production"
CFG[PLATFORM_DOMAIN]="festschmiede.example.de"
CFG[DOCKER_PROXY_NETWORK]="traefik_net"
CFG[DOCKER_NETWORK]="traefik_net"
CFG[DOCKER_NETWORK_CREATE]="no"
apply_defaults
[[ "${CFG[INSTALL_PROFILE]}" == "production" && "${CFG[PLATFORM_DOMAIN]}" == "festschmiede.example.de" ]] \
  && pass "existing proxy uses production profile" || fail "existing proxy uses production profile"
generate_compose_override
grep -qE "ports: (\[\]|!reset \[\])" "${INSTALL_DIR}/installer/generated/compose.override.yml" \
  && pass "proxy mode no host ports" || fail "proxy mode no host ports"
grep -q "proxy" "${INSTALL_DIR}/installer/generated/compose.override.yml" \
  && pass "proxy network defined" || fail "proxy network defined"
grep -q "external: true" "${INSTALL_DIR}/installer/generated/compose.override.yml" \
  && pass "external proxy network" || fail "external proxy network"

CFG[PROXY_MODE]="traefik"
CFG[DOCKER_NETWORK_CREATE]="yes"
generate_compose_override
grep -q "public" "${INSTALL_DIR}/installer/generated/compose.override.yml" \
  && pass "traefik uses public network" || fail "traefik uses public network"

echo ""
echo "Ergebnis: $PASS bestanden, $FAIL fehlgeschlagen"
[[ $FAIL -eq 0 ]]
