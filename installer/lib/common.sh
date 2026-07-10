#!/usr/bin/env bash
# FestSchmiede Installer – gemeinsame Variablen und Hilfsfunktionen

INSTALLER_VERSION="2.2.2"
PRODUCT_NAME="FestSchmiede"

# Installationsverzeichnis (Repo-Root) – nur setzen wenn nicht bereits gesetzt
if [[ -z "${INSTALL_DIR:-}" ]]; then
  INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi

if [[ -z "${INSTALLER_DIR:-}" ]]; then
  INSTALLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi
STATE_DIR="${INSTALLER_STATE_DIR:-${INSTALL_DIR}/.installer-state}"
LOG_DIR="${INSTALLER_LOG_DIR:-${INSTALL_DIR}/installer/logs}"
BACKUP_DIR="${STATE_DIR}/backups"

mkdir -p "$STATE_DIR" "$LOG_DIR" "$BACKUP_DIR"

LOG_FILE="${LOG_FILE:-${LOG_DIR}/install-$(date +%Y%m%d-%H%M%S).log}"
STATE_FILE="${STATE_DIR}/install.state"

# Wizard-Schritt (0 = Willkommen, 1-13 = Schritte, 14 = Installation, 15 = Abschluss)
WIZARD_STEP=0
WIZARD_CANCELLED=0

# Installationsmodus
INSTALL_MODE="fresh"

# Erkannte Systemdaten (werden von detect.sh befüllt)
declare -A SYS_DETECT=()
declare -a DOCKER_NETWORKS=()
declare -a DOCKER_VOLUMES=()
declare -a DOCKER_CONTAINERS=()

# Benutzerkonfiguration
declare -A CFG=()

# Secrets
declare -A SECRETS=()

# Compose-Dateien
COMPOSE_FILES=("-f" "${INSTALL_DIR}/docker-compose.yml")
COMPOSE_CMD=(docker compose)

# shellcheck source=installer/lib/log.sh
source "${INSTALLER_DIR}/lib/log.sh"

load_existing_env() {
  local env_file="${INSTALL_DIR}/.env"
  [[ -f "$env_file" ]] || return 0
  log_info "Lade vorhandene .env: $env_file"
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    value="${value%$'\r'}"
    value="${value#\"}"; value="${value%\"}"
    CFG["$key"]="$value"
  done < <(grep -E '^[A-Z_]+=' "$env_file" 2>/dev/null || true)
}

save_state() {
  {
    echo "WIZARD_STEP=$WIZARD_STEP"
    echo "INSTALL_MODE=$INSTALL_MODE"
    for key in "${!CFG[@]}"; do
      # Keine Secrets im State-File (nur in .env / credentials.txt)
      case "$key" in
        JWT_SECRET|APP_ENCRYPTION_KEY|POSTGRES_PASSWORD|PLATFORM_ADMIN_PASSWORD|*_SECRET|*_PASSWORD|*_KEY)
          continue
          ;;
      esac
      printf 'CFG_%s=%q\n' "$key" "${CFG[$key]}"
    done
  } >"$STATE_FILE"
  chmod 600 "$STATE_FILE" 2>/dev/null || true
}

load_state() {
  [[ -f "$STATE_FILE" ]] || return 0
  # shellcheck disable=SC1090
  source "$STATE_FILE" 2>/dev/null || true
}

detect_existing_installation() {
  [[ -f "${INSTALL_DIR}/.env" ]] && [[ -d "${STATE_DIR}" ]] && docker compose -f "${INSTALL_DIR}/docker-compose.yml" ps -q 2>/dev/null | grep -q .
}
