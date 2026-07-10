#!/usr/bin/env bash
# FestSchmiede Installer – Datenbank-Backup vor Migrationen

run_pre_migration_backup() {
  case "$INSTALL_MODE" in
    upgrade|migration|repair)
      ;;
    *)
      return 0
      ;;
  esac

  local backup_script="${INSTALL_DIR}/scripts/backup/postgres-backup.sh"
  if [[ ! -x "$backup_script" ]]; then
    log_warn "Backup-Skript nicht gefunden: $backup_script"
    if [[ "$INSTALL_MODE" == "upgrade" || "$INSTALL_MODE" == "migration" ]]; then
      if ! tui_yesno "Ohne Backup fortfahren?" \
        "Kein Datenbank-Backup möglich.\n\nEin Backup vor Schema-Migrationen ist dringend empfohlen.\n\nTrotzdem fortfahren?"; then
        log_error "Installation abgebrochen – Backup erforderlich"
        return 1
      fi
    fi
    return 0
  fi

  log_info "Erstelle Datenbank-Backup vor Migration..."
  if ! (cd "$INSTALL_DIR" && BACKUP_DIR="${INSTALL_DIR}/backups" ./scripts/backup/postgres-backup.sh) >>"$LOG_FILE" 2>&1; then
    log_error "Datenbank-Backup fehlgeschlagen"
    if ! tui_yesno "Backup fehlgeschlagen" "Das Datenbank-Backup ist fehlgeschlagen.\n\nOhne Backup ist ein Rollback bei Migrationsfehlern schwierig.\n\nTrotzdem fortfahren?"; then
      return 1
    fi
  else
    log_info "Datenbank-Backup erfolgreich (backups/)"
  fi
  return 0
}
