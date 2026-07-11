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
[[ -f "${INSTALL_DIR}/docker-compose.override.yml" ]] \
  && pass "override published at install root" || fail "override published at install root"
! grep -qE "ports: (\[\]|!reset \[\])" "${INSTALL_DIR}/installer/generated/compose.override.yml" \
  && pass "local keeps host ports" || fail "local keeps host ports"

CFG[USES_REVERSE_PROXY]="yes"
CFG[PROXY_MODE]="nginx"
CFG[PROXY_DEPLOYMENT]="external"
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
[[ -f "${INSTALL_DIR}/installer/generated/proxy/nginx-site.conf" ]] \
  && pass "nginx proxy config generated" || fail "nginx proxy config generated"

CFG=()
CFG[PROXY_MODE]="traefik"
CFG[PROXY_DEPLOYMENT]="external"
CFG[USES_REVERSE_PROXY]="yes"
CFG[INSTALL_PROFILE]="local"
CFG[PLATFORM_DOMAIN]="festschmiede.example.de"
apply_defaults
[[ "${CFG[INSTALL_PROFILE]}" == "production" && "${CFG[CORS_ORIGIN]}" == "https://app.festschmiede.example.de" ]] \
  && pass "proxy infers production CORS" || fail "proxy infers production CORS"

CFG[PROXY_MODE]="traefik"
CFG[PROXY_DEPLOYMENT]="external"
CFG[HTTPS_ENABLED]="yes"
CFG[TRAEFIK_CERT_RESOLVER]="letsencrypt"
CFG[DOCKER_PROXY_NETWORK]="traefik_net"
CFG[DOCKER_NETWORK]="traefik_net"
CFG[DOCKER_NETWORK_CREATE]="no"
generate_compose_override
generate_all_secrets
generate_env_file
grep -q "COMPOSE_FILE=docker-compose.yml:docker-compose.override.yml" "${INSTALL_DIR}/.env" \
  && pass "compose file env var" || fail "compose file env var"
grep -q "traefik.enable=true" "${INSTALL_DIR}/docker-compose.override.yml" \
  && pass "external traefik labels" || fail "external traefik labels"
grep -q "traefik.docker.network=traefik_net" "${INSTALL_DIR}/docker-compose.override.yml" \
  && pass "external traefik network label" || fail "external traefik network label"

CFG[PROXY_MODE]="traefik"
CFG[PROXY_DEPLOYMENT]="bundled"
CFG[DOCKER_NETWORK_CREATE]="yes"
generate_compose_override
grep -q "public" "${INSTALL_DIR}/docker-compose.override.yml" \
  && pass "traefik uses public network" || fail "traefik uses public network"
grep -q "driver: bridge" "${INSTALL_DIR}/docker-compose.override.yml" \
  && pass "traefik public network created" || fail "traefik public network created"
! grep -q "traefik.enable=true" "${INSTALL_DIR}/docker-compose.override.yml" \
  && pass "bundled traefik labels only in prod overlay" || fail "bundled traefik labels only in prod overlay"

echo "--- Postgres Volume ---"
TMP_PG=$(mktemp -d)
export INSTALL_DIR="$TMP_PG" INSTALLER_DIR BACKUP_DIR="${TMP_PG}/.installer-state/backups"
mkdir -p "$BACKUP_DIR/pre-install-old"
echo 'POSTGRES_USER=legacyuser' >"$BACKUP_DIR/pre-install-old/.env"
echo 'POSTGRES_PASSWORD=legacypass' >>"$BACKUP_DIR/pre-install-old/.env"
echo 'POSTGRES_DB=legacydb' >>"$BACKUP_DIR/pre-install-old/.env"
CFG=()
SYS_DETECT[postgres_volume]=yes
source "${INSTALLER_DIR}/lib/config.sh"
cred=$(find_postgres_credentials_backup)
load_postgres_credentials_from_file "$cred" \
  && [[ "${CFG[POSTGRES_USER]}" == "legacyuser" && "${CFG[POSTGRES_PASSWORD]}" == "legacypass" ]] \
  && pass "postgres credentials from backup" || fail "postgres credentials from backup"
rm -rf "$TMP_PG"

echo "--- Postgres Volume Filter ---"
export INSTALL_DIR="/srv/apps/festschmiede"
DOCKER_VOLUMES=(patchmon_postgres_data other_postgres_data)
# shellcheck source=installer/lib/detect.sh
source "${INSTALLER_DIR}/lib/detect.sh"
detect_postgres_volume
[[ "${SYS_DETECT[postgres_volume]:-no}" == "no" ]] \
  && pass "ignores foreign postgres volumes" || fail "ignores foreign postgres volumes"

DOCKER_VOLUMES=(patchmon_postgres_data festschmiede_postgres_data)
detect_postgres_volume
[[ "${SYS_DETECT[postgres_volume_name]:-}" == "festschmiede_postgres_data" ]] \
  && pass "detects festschmiede postgres volume" || fail "detects festschmiede postgres volume"

DOCKER_VOLUMES=(vereins_postgres_data)
detect_postgres_volume
[[ "${SYS_DETECT[postgres_volume_name]:-}" == "vereins_postgres_data" ]] \
  && pass "detects legacy vereins postgres volume" || fail "detects legacy vereins postgres volume"

echo ""
echo "Ergebnis: $PASS bestanden, $FAIL fehlgeschlagen"
[[ $FAIL -eq 0 ]]
