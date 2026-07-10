#!/usr/bin/env bash
# FestSchmiede Installer – Rollback

create_pre_install_backup() {
  local ts
  ts=$(date +%Y%m%d-%H%M%S)
  local backup_path="${BACKUP_DIR}/pre-install-${ts}"
  mkdir -p "$backup_path"

  [[ -f "${INSTALL_DIR}/.env" ]] && cp "${INSTALL_DIR}/.env" "$backup_path/"
  [[ -f "${INSTALL_DIR}/installer/generated/compose.override.yml" ]] && \
    cp "${INSTALL_DIR}/installer/generated/compose.override.yml" "$backup_path/"

  echo "$backup_path" >"${STATE_DIR}/last_backup"
  log_info "Pre-Install-Backup: $backup_path"
}

perform_rollback() {
  local backup_path
  backup_path=$(cat "${STATE_DIR}/last_backup" 2>/dev/null || true)

  if [[ -z "$backup_path" || ! -d "$backup_path" ]]; then
    # Neuestes Backup suchen
    backup_path=$(ls -td "${BACKUP_DIR}"/pre-install-* 2>/dev/null | head -1)
  fi

  if [[ -z "$backup_path" ]]; then
    log_error "Kein Backup für Rollback gefunden"
    return 1
  fi

  log_info "Rollback von: $backup_path"

  compose_down

  [[ -f "${backup_path}/.env" ]] && cp "${backup_path}/.env" "${INSTALL_DIR}/.env"
  [[ -f "${backup_path}/compose.override.yml" ]] && \
    cp "${backup_path}/compose.override.yml" "${INSTALL_DIR}/installer/generated/compose.override.yml"

  log_info "Rollback abgeschlossen – Konfiguration wiederhergestellt"

  # Stack mit wiederhergestellter Konfiguration starten
  if [[ -f "${INSTALL_DIR}/.env" ]]; then
    load_existing_env
    build_compose_files 2>/dev/null || true
    compose_up 2>/dev/null || log_warn "compose up nach Rollback fehlgeschlagen — manuell starten"
  fi

  tui_msgbox "Rollback" "Die vorherige Konfiguration wurde wiederhergestellt.\n\nBackup: $backup_path\n\nContainer wurden neu gestartet." 2>/dev/null || \
    echo "Rollback abgeschlossen: $backup_path"
  return 0
}

handle_install_error() {
  local err="$1"
  log_error "Installationsfehler: $err"

  local action
  action=$(tui_error_menu "Installation fehlgeschlagen:\n\n$err\n\nProtokoll: $LOG_FILE")

  case "$action" in
    retry) return 2 ;;
    rollback) perform_rollback; return 1 ;;
    log)
      if command -v less >/dev/null 2>&1; then
        less "$LOG_FILE"
      else
        tail -50 "$LOG_FILE"
      fi
      handle_install_error "$err"
      ;;
    *) return 1 ;;
  esac
}
