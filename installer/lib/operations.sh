#!/usr/bin/env bash
# FestSchmiede Installer – Geführte Betriebsabläufe (Update, Reparatur, Backup)

# shellcheck source=installer/lib/common.sh
source "${INSTALLER_DIR}/lib/common.sh"
source "${INSTALLER_DIR}/lib/errors.sh"
source "${INSTALLER_DIR}/lib/config.sh"
source "${INSTALLER_DIR}/lib/docker.sh"
source "${INSTALLER_DIR}/lib/rollback.sh"

load_install_env() {
  dotenv_export_file "${INSTALL_DIR}/.env"
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
  local probe_url body internal_body
  apply_defaults
  probe_url=$(describe_backend_health_probe)

  log_info "Health-Check (strikt): $probe_url"
  local i
  for ((i=1; i<=timeout; i++)); do
    if [[ "${CFG[INSTALL_PROFILE]:-}" == "production" ]]; then
      body=$(fetch_public_https_health_body 2>/dev/null || true)
      if parse_health_response_ok "$body"; then
        log_info "Health OK nach ${i}s (HTTPS über Domain)"
        return 0
      fi
      internal_body=$(fetch_internal_backend_health_body 2>/dev/null || true)
      if parse_health_response_ok "$internal_body"; then
        log_warn "Health OK intern nach ${i}s — externe Domain von diesem Server nicht erreichbar (NAT/Hairpin?)"
        log_warn "Bitte im Browser prüfen: ${probe_url}"
        return 0
      fi
      if parse_health_database_ok "$internal_body"; then
        log_warn "Datenbank OK intern nach ${i}s — App läuft, externe Domain-Prüfung übersprungen"
        return 0
      fi
    elif backend_health_ok; then
      log_info "Health OK nach ${i}s"
      return 0
    fi
    sleep 1
  done

  installer_fail health_failed "Timeout nach ${timeout}s — API nicht über konfigurierte Domain erreichbar"
  return "$EXIT_HEALTH"
}

wait_for_migration() {
  # Migration läuft beim Backend-Start (prisma migrate deploy im Container)
  _ops_progress "Warte auf Datenbank-Migration..."
  local i body elapsed=0

  if deployment_uses_swarm; then
    wait_for_swarm_health 180 || {
      installer_fail migration_failed "Swarm-Backend nicht bereit — docker service ps festschmiede_backend prüfen"
      return "$EXIT_MIGRATION"
    }
  fi

  for ((i=1; i<=120; i++)); do
    body=$(fetch_internal_backend_health_body 2>/dev/null || true)
    if parse_health_database_ok "$body"; then
      log_info "Migration/Backend bereit nach ${elapsed}s"
      return 0
    fi
    if (( i % 15 == 0 )); then
      _ops_progress "Warte auf Backend-Health... (${elapsed}s / max. 240s)"
      log_info "Backend-Health noch nicht OK (${elapsed}s) — docker service logs festschmiede_backend --tail 30"
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  installer_fail migration_failed "Backend meldet keine erfolgreiche DB-Verbindung nach 240s"
  return "$EXIT_MIGRATION"
}

perform_update_rollback() {
  local reason="${1:-unknown}"
  local db_backup restore_db=0 skip_stack_down=0
  db_backup=$(cat "${STATE_DIR}/last_db_backup" 2>/dev/null || true)

  case "$reason" in
    docker)
      skip_stack_down=1
      restore_db=0
      log_warn "Starte Konfigurations-Rollback (kein DB-Restore)..."
      ;;
    migration|health)
      restore_db=1
      log_warn "Starte Update-Rollback (Konfiguration + optional Datenbank)..."
      ;;
    *)
      log_warn "Starte Update-Rollback..."
      ;;
  esac

  perform_rollback "$skip_stack_down" || return "$EXIT_ROLLBACK"

  if [[ $restore_db -eq 1 && -n "$db_backup" && -f "$db_backup" ]]; then
    local do_restore=0
    if [[ "${FESTSCHMIEDE_AUTO_DB_ROLLBACK:-}" == "1" ]]; then
      log_info "Stelle Datenbank wieder her: $db_backup"
      do_restore=1
    elif [[ "${FESTSCHMIEDE_NONINTERACTIVE:-}" != "1" ]] && tui_yesno "Datenbank wiederherstellen?" "Das Update ist fehlgeschlagen.\n\nSoll die Datenbank aus dem Backup wiederhergestellt werden?\n\n$db_backup"; then
      do_restore=1
    else
      log_warn "Kein automatischer DB-Rollback (FESTSCHMIEDE_AUTO_DB_ROLLBACK=1 zum Erzwingen)"
    fi
    if [[ $do_restore -eq 1 ]]; then
      CONFIRM=1 "${INSTALL_DIR}/scripts/backup/postgres-restore.sh" "$db_backup" >>"$LOG_FILE" 2>&1 || {
        installer_fail rollback_failed "DB-Restore fehlgeschlagen"
        return "$EXIT_ROLLBACK"
      }
      if deployment_uses_swarm; then
        stack_deploy || true
      else
        build_compose_files
        compose_up || true
      fi
    fi
  fi

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
  apply_defaults
  generate_deployment_config
  generate_env_file
  build_compose_files

  _ops_progress "Schritt 1/6: Installer-Bootstrap (bereits aktualisiert)..."
  log_info "Installer-Version: ${INSTALLER_VERSION} (Bootstrap Phase 1 abgeschlossen)"

  _ops_progress "Schritt 2/6: Konfigurations-Backup..."
  create_pre_install_backup

  _ops_progress "Schritt 3/6: Datenbank-Backup..."
  run_database_backup || return $?

  _ops_progress "Schritt 4/6: Neue Images laden..."
  apply_shell_env_overrides
  log_info "Verwende Image-Tag: ${CFG[IMAGE_TAG]} (Prefix: ${CFG[GHCR_IMAGE_PREFIX]})"
  generate_deployment_config
  if deployment_uses_swarm; then
    stack_pull || { installer_fail docker_pull; return "$EXIT_DOCKER"; }
  else
    compose_pull || { installer_fail docker_pull; return "$EXIT_DOCKER"; }
  fi

  _ops_progress "Schritt 5/6: Services starten (Migration)..."
  if deployment_uses_swarm; then
    stack_deploy || { installer_fail docker_up; perform_update_rollback docker; return "$EXIT_DOCKER"; }
  else
    compose_up || { installer_fail docker_up; perform_update_rollback docker; return "$EXIT_DOCKER"; }
  fi

  wait_for_migration || { perform_update_rollback migration; return "$EXIT_MIGRATION"; }

  _ops_progress "Schritt 6/6: Health-Check..."
  if ! verify_health_strict 180; then
    perform_update_rollback health
    return "$EXIT_HEALTH"
  fi

  log_info "Geführtes Update erfolgreich abgeschlossen"
  return 0
}

run_guided_repair() {
  load_existing_env
  apply_defaults
  generate_deployment_config
  generate_env_file
  build_compose_files

  _ops_progress "Reparatur: Services neu starten..."
  if deployment_uses_swarm; then
    stack_deploy || { installer_fail docker_up; return "$EXIT_DOCKER"; }
  else
    compose_up || { installer_fail docker_up; return "$EXIT_DOCKER"; }
  fi

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
