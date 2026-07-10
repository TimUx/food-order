#!/usr/bin/env bash
# FestSchmiede Installer – Geführte Betriebsabläufe (Update, Reparatur, Backup)

# shellcheck source=installer/lib/common.sh
source "${INSTALLER_DIR}/lib/common.sh"
source "${INSTALLER_DIR}/lib/errors.sh"
source "${INSTALLER_DIR}/lib/docker.sh"
source "${INSTALLER_DIR}/lib/rollback.sh"

load_install_env() {
  if [[ -f "${INSTALL_DIR}/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "${INSTALL_DIR}/.env"
    set +a
  fi
}

_ops_progress() {
  local msg="$1"
  if [[ "${FESTSCHMIEDE_NONINTERACTIVE:-}" == "1" ]]; then
    echo "[FestSchmiede] $msg"
  else
    tui_gauge "Betrieb" 50 "$msg" 2>/dev/null || echo "[FestSchmiede] $msg"
  fi
}

run_database_backup() {
  local backup_script="${INSTALL_DIR}/scripts/backup/postgres-backup.sh"
  if [[ ! -x "$backup_script" ]]; then
    chmod +x "$backup_script" 2>/dev/null || true
  fi
  if [[ ! -f "$backup_script" ]]; then
    installer_fail backup_failed "Backup-Skript nicht gefunden: $backup_script"
    return "$EXIT_BACKUP"
  fi

  _ops_progress "Erstelle Datenbank-Backup..."
  load_install_env
  local output
  if ! output=$(cd "$INSTALL_DIR" && bash "$backup_script" 2>&1); then
    installer_fail backup_failed "$output"
    return "$EXIT_BACKUP"
  fi

  local backup_file
  backup_file=$(echo "$output" | grep -oE '[^ ]+\.sql\.gz' | tail -1)
  if [[ -z "$backup_file" ]]; then
    installer_fail backup_failed "Kein Backup-Pfad in Ausgabe: $output"
    return "$EXIT_BACKUP"
  fi

  # Relativ zu INSTALL_DIR auflösen
  if [[ "$backup_file" != /* ]]; then
    backup_file="${INSTALL_DIR}/${backup_file#./}"
  fi

  echo "$backup_file" >"${STATE_DIR}/last_db_backup"
  log_info "Datenbank-Backup: $backup_file"
  echo "$backup_file"
  return 0
}

verify_health_strict() {
  local timeout="${1:-180}"
  local api_url="http://localhost:3001/api/health"

  if [[ "${CFG[INSTALL_PROFILE]:-local}" == "production" && -n "${CFG[PLATFORM_DOMAIN]:-}" ]]; then
    api_url="https://${CFG[API_SUBDOMAIN]:-api}.${CFG[PLATFORM_DOMAIN]}/api/health"
  fi

  log_info "Health-Check (strikt): $api_url"
  local i body status db_ok
  for ((i=1; i<=timeout; i++)); do
    body=$(curl -kfsS "$api_url" 2>/dev/null || true)
    if [[ -n "$body" ]]; then
      status=$(echo "$body" | grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
      db_ok=$(echo "$body" | grep -o '"ok"[[:space:]]*:[[:space:]]*true' | head -1 || true)
      if [[ "$status" == "ok" && -n "$db_ok" ]]; then
        log_info "Health OK nach ${i}s"
        return 0
      fi
    fi
    sleep 1
  done

  installer_fail health_failed "Timeout nach ${timeout}s — API nicht bereit"
  return "$EXIT_HEALTH"
}

wait_for_migration() {
  # Migration läuft beim Backend-Start (prisma db push / migrate deploy im Container)
  _ops_progress "Warte auf Datenbank-Migration..."
  local i
  for ((i=1; i<=120; i++)); do
    if docker compose -f "${INSTALL_DIR}/docker-compose.yml" logs backend 2>/dev/null | tail -30 | grep -qE 'migrate|db push|listening|Server'; then
      if curl -kfsS http://localhost:3001/api/health 2>/dev/null | grep -q '"database"'; then
        log_info "Migration/Backend bereit nach ${i}s"
        return 0
      fi
    fi
    sleep 2
  done
  installer_fail migration_failed "Backend meldet keine erfolgreiche DB-Verbindung"
  return "$EXIT_MIGRATION"
}

perform_update_rollback() {
  local db_backup
  db_backup=$(cat "${STATE_DIR}/last_db_backup" 2>/dev/null || true)

  log_warn "Starte Update-Rollback..."
  perform_rollback || return "$EXIT_ROLLBACK"

  if [[ -n "$db_backup" && -f "$db_backup" ]]; then
    if [[ "${FESTSCHMIEDE_NONINTERACTIVE:-}" == "1" ]]; then
      log_info "Stelle Datenbank wieder her: $db_backup"
      CONFIRM=1 "${INSTALL_DIR}/scripts/backup/postgres-restore.sh" "$db_backup" >>"$LOG_FILE" 2>&1 || {
        installer_fail rollback_failed "DB-Restore fehlgeschlagen"
        return "$EXIT_ROLLBACK"
      }
    elif tui_yesno "Datenbank wiederherstellen?" "Das Update ist fehlgeschlagen.\n\nSoll die Datenbank aus dem Backup wiederhergestellt werden?\n\n$db_backup"; then
      CONFIRM=1 "${INSTALL_DIR}/scripts/backup/postgres-restore.sh" "$db_backup" >>"$LOG_FILE" 2>&1 || {
        installer_fail rollback_failed "DB-Restore fehlgeschlagen"
        return "$EXIT_ROLLBACK"
      }
    fi
  fi

  build_compose_files
  compose_up || true
  tui_msgbox "Rollback abgeschlossen" "Die Installation wurde auf den vorherigen Stand zurückgesetzt.\n\nProtokoll: $LOG_FILE" 2>/dev/null || true
  return 0
}

# Geführter Update: Backup → Pull → Up → Migration → Health → Rollback bei Fehler
run_guided_update() {
  if [[ ! -f "${INSTALL_DIR}/.env" ]]; then
    installer_fail no_install
    return "$EXIT_GENERAL"
  fi

  load_existing_env
  load_secrets_from_env
  build_compose_files

  _ops_progress "Schritt 1/5: Konfigurations-Backup..."
  create_pre_install_backup

  _ops_progress "Schritt 2/5: Datenbank-Backup..."
  run_database_backup || return $?

  _ops_progress "Schritt 3/5: Neue Images laden..."
  compose_pull || { installer_fail docker_pull; return "$EXIT_DOCKER"; }

  _ops_progress "Schritt 4/5: Container starten (Migration)..."
  compose_up || { installer_fail docker_up; perform_update_rollback; return "$EXIT_DOCKER"; }

  wait_for_migration || { perform_update_rollback; return "$EXIT_MIGRATION"; }

  _ops_progress "Schritt 5/5: Health-Check..."
  if ! verify_health_strict 180; then
    perform_update_rollback
    return "$EXIT_HEALTH"
  fi

  log_info "Geführtes Update erfolgreich abgeschlossen"
  return 0
}

run_guided_repair() {
  load_existing_env
  build_compose_files

  _ops_progress "Reparatur: Container neu starten..."
  compose_up || { installer_fail docker_up; return "$EXIT_DOCKER"; }

  verify_health_strict 120 || return $?
  log_info "Reparatur erfolgreich"
  return 0
}

run_guided_backup() {
  run_database_backup
}

# Validierung ohne Änderungen (für --validate-update)
validate_update_readiness() {
  local errors=0
  [[ -f "${INSTALL_DIR}/.env" ]] || { echo "FEHLT: .env"; errors=$((errors+1)); }
  [[ -f "${INSTALL_DIR}/docker-compose.yml" ]] || { echo "FEHLT: docker-compose.yml"; errors=$((errors+1)); }
  command -v docker >/dev/null 2>&1 || { echo "FEHLT: docker"; errors=$((errors+1)); }
  docker info >/dev/null 2>&1 || { echo "FEHLT: docker daemon"; errors=$((errors+1)); }
  [[ -x "${INSTALL_DIR}/scripts/backup/postgres-backup.sh" ]] || echo "WARNUNG: backup script nicht ausführbar"
  return "$errors"
}
