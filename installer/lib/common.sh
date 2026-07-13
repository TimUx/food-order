#!/usr/bin/env bash
# FestSchmiede Installer – gemeinsame Variablen und Hilfsfunktionen

INSTALLER_VERSION="2.4.18"
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

resolve_install_dir_path() {
  local path="$1"
  [[ -n "$path" ]] || return 1

  if [[ "$path" == "~" ]]; then
    path="$HOME"
  elif [[ "$path" == "~/"* ]]; then
    path="${HOME}/${path:2}"
  elif [[ "$path" != /* ]]; then
    path="$(pwd)/$path"
  fi

  local parent="${path%/*}"
  [[ -n "$parent" && "$parent" != "$path" ]] || parent="/"
  mkdir -p "$parent" || return 1
  printf '%s\n' "$path"
}

set_install_dir() {
  local new_dir="$1"
  INSTALL_DIR="$new_dir"
  STATE_DIR="${INSTALLER_STATE_DIR:-${INSTALL_DIR}/.installer-state}"
  LOG_DIR="${INSTALLER_LOG_DIR:-${INSTALL_DIR}/installer/logs}"
  BACKUP_DIR="${STATE_DIR}/backups"
  mkdir -p "$STATE_DIR" "$LOG_DIR" "$BACKUP_DIR"
  STATE_FILE="${STATE_DIR}/install.state"
  COMPOSE_FILES=("-f" "${INSTALL_DIR}/docker-compose.yml")
  export INSTALL_DIR
}

relocate_install_tree() {
  local from="$1" to="$2"
  [[ "$from" == "$to" ]] && return 0
  [[ -f "${from}/docker-compose.yml" ]] || return 0

  mkdir -p "$to"
  log_info "Verschiebe Installation von ${from} nach ${to}..."

  local manifest rel_path
  manifest="${INSTALLER_DIR}/bootstrap-files.txt"
  if [[ ! -f "$manifest" ]]; then
    manifest="${from}/installer/bootstrap-files.txt"
  fi
  if [[ ! -f "$manifest" ]]; then
    log_error "bootstrap-files.txt fehlt — Relocation abgebrochen"
    return 1
  fi

  while IFS= read -r rel_path; do
    [[ -n "$rel_path" ]] || continue
    [[ "$rel_path" =~ ^# ]] && continue
    [[ -f "${from}/${rel_path}" ]] || continue
    mkdir -p "$(dirname "${to}/${rel_path}")"
    cp -a "${from}/${rel_path}" "${to}/${rel_path}"
  done < <(grep -vE '^\s*(#|$)' "$manifest")

  for rel_path in install.sh installer/install.sh scripts/backup/postgres-backup.sh scripts/backup/postgres-restore.sh; do
    [[ -f "${to}/${rel_path}" ]] && chmod +x "${to}/${rel_path}" 2>/dev/null || true
  done

  [[ -f "${from}/.env" ]] && cp -a "${from}/.env" "${to}/.env"
  [[ -d "${from}/.installer-state" ]] && cp -a "${from}/.installer-state" "${to}/"
  [[ -f "${from}/docker-compose.override.yml" ]] && cp -a "${from}/docker-compose.override.yml" "${to}/"
  [[ -f "${from}/installer/generated/compose.override.yml" ]] && \
    mkdir -p "${to}/installer/generated" && \
    cp -a "${from}/installer/generated/compose.override.yml" "${to}/installer/generated/"
  [[ -d "${from}/installer/logs" ]] && mkdir -p "${to}/installer/logs" && \
    cp -a "${from}/installer/logs/." "${to}/installer/logs/" 2>/dev/null || true
  [[ -d "${from}/backups" ]] && cp -a "${from}/backups" "${to}/" 2>/dev/null || true
}

# shellcheck source=scripts/lib/dotenv.sh
if [[ -f "${INSTALL_DIR}/scripts/lib/dotenv.sh" ]]; then
  source "${INSTALL_DIR}/scripts/lib/dotenv.sh"
else
  dotenv_unquote_value() {
    local value="$1"
    value="${value%$'\r'}"
    if [[ ${#value} -ge 2 && "$value" == \'*\' ]]; then
      value="${value:1:${#value}-2}"
    elif [[ ${#value} -ge 2 && "$value" == \"*\" ]]; then
      value="${value:1:${#value}-2}"
    fi
    printf '%s' "$value"
  }

  dotenv_format_value() {
    local val="$1"
    if [[ "$val" =~ [\`\$\(\)\|\;\&\<\>\ \!\#\*\\] ]]; then
      local escaped
      escaped=$(printf '%s' "$val" | sed "s/'/'\\\\''/g")
      printf "'%s'" "$escaped"
    else
      printf '%s' "$val"
    fi
  }

  dotenv_export_file() {
    local env_file="$1"
    shift
    local filter_keys=("$@")
    local line key value match k

    [[ -f "$env_file" ]] || return 0

    while IFS= read -r line || [[ -n "$line" ]]; do
      [[ "$line" =~ ^[[:space:]]*# ]] && continue
      [[ "$line" =~ ^[A-Z_][A-Z0-9_]*= ]] || continue
      key="${line%%=*}"
      value="$(dotenv_unquote_value "${line#*=}")"

      if [[ ${#filter_keys[@]} -gt 0 ]]; then
        match=0
        for k in "${filter_keys[@]}"; do
          if [[ "$key" == "$k" ]]; then
            match=1
            break
          fi
        done
        [[ $match -eq 1 ]] || continue
      fi

      printf -v "$key" '%s' "$value"
      export "$key"
    done <"$env_file"
  }
fi

load_existing_env() {
  local env_file="${INSTALL_DIR}/.env"
  [[ -f "$env_file" ]] || return 0
  log_info "Lade vorhandene .env: $env_file"
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    CFG["$key"]="$(dotenv_unquote_value "$value")"
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
