#!/usr/bin/env bash
# FestSchmiede Installer – Docker-Installation und -Betrieb

install_docker_if_missing() {
  [[ "${SYS_DETECT[docker_installed]}" == "yes" ]] && return 0

  log_info "Docker nicht gefunden – Installation anbieten"
  if ! tui_yesno "Docker installieren" "Docker ist nicht installiert.\n\nSoll Docker jetzt installiert werden?\n(Unterstützt: Debian/Ubuntu via get.docker.com)"; then
    log_error "Docker erforderlich – Installation abgebrochen"
    return 1
  fi

  log_info "Installiere Docker..."
  if curl -fsSL https://get.docker.com | sh >>"$LOG_FILE" 2>&1; then
    SYS_DETECT[docker_installed]="yes"
    SYS_DETECT[docker_version]="$(docker --version 2>/dev/null)"
    SYS_DETECT[compose_installed]="yes"
    log_info "Docker erfolgreich installiert"
    return 0
  fi

  log_error "Docker-Installation fehlgeschlagen"
  return 1
}

compose_pull() {
  log_info "Lade Docker-Images..."
  (cd "$INSTALL_DIR" && "${COMPOSE_CMD[@]}" "${COMPOSE_FILES[@]}" pull) >>"$LOG_FILE" 2>&1
}

compose_up() {
  local profiles=()
  [[ "${CFG[USE_REDIS]:-no}" == "yes" ]] && profiles+=(--profile redis)

  log_info "Starte Container..."
  (cd "$INSTALL_DIR" && "${COMPOSE_CMD[@]}" "${COMPOSE_FILES[@]}" "${profiles[@]}" up -d) >>"$LOG_FILE" 2>&1
}

compose_down() {
  log_info "Stoppe Container..."
  (cd "$INSTALL_DIR" && "${COMPOSE_CMD[@]}" "${COMPOSE_FILES[@]}" down) >>"$LOG_FILE" 2>&1 || true
}

wait_for_health() {
  local timeout="${1:-180}"
  log_info "Warte auf Dienste (max. ${timeout}s)..."

  local api_url="http://localhost:3001/api/health"
  local frontend_url="http://localhost:5173"

  if [[ "${CFG[INSTALL_PROFILE]}" == "production" ]]; then
    api_url="https://${CFG[API_SUBDOMAIN]:-api}.${CFG[PLATFORM_DOMAIN]}/api/health"
    frontend_url="https://${CFG[PLATFORM_DOMAIN]}"
  fi

  local i
  for ((i=1; i<=timeout; i++)); do
    tui_gauge "Installation" $((i * 50 / timeout)) "Warte auf Backend... (${i}s)"
    if curl -kfsS "$api_url" >/dev/null 2>&1; then
      log_info "Backend bereit nach ${i}s"
      break
    fi
    [[ $i -eq $timeout ]] && { log_error "Backend-Timeout"; return 1; }
    sleep 1
  done

  for ((i=1; i<=60; i++)); do
    tui_gauge "Installation" $((50 + i * 50 / 60)) "Warte auf Frontend... (${i}s)"
    if curl -kfsS "$frontend_url" >/dev/null 2>&1; then
      log_info "Frontend bereit nach ${i}s"
      return 0
    fi
    sleep 1
  done

  log_warn "Frontend nicht erreichbar – Installation möglicherweise trotzdem erfolgreich"
  return 0
}

run_installation() {
  local step=0
  local total=6

  tui_gauge "Installation" 0 "Vorbereitung..."
  install_docker_if_missing || return 1
  step=$((step+1))

  if [[ "$INSTALL_MODE" != "config" ]]; then
    tui_gauge "Installation" $((step*100/total)) "Generiere Konfiguration..."
    generate_compose_override
    generate_env_file
    build_compose_files
    step=$((step+1))

    tui_gauge "Installation" $((step*100/total)) "Lade Images..."
    compose_pull || return 1
    step=$((step+1))

    tui_gauge "Installation" $((step*100/total)) "Datenbank-Backup..."
    run_pre_migration_backup || return 1
    step=$((step+1))

    tui_gauge "Installation" $((step*100/total)) "Starte Container..."
    compose_up || return 1
    step=$((step+1))

    tui_gauge "Installation" $((step*100/total)) "Health-Check..."
    wait_for_health || return 1
  else
    generate_env_file
    build_compose_files
    compose_up || return 1
  fi

  tui_gauge "Installation" 100 "Abgeschlossen"
  log_info "Installation erfolgreich abgeschlossen"
  return 0
}

docker_status_report() {
  local s=""
  s+="Container:\n"
  s+="$(docker ps --format '  {{.Names}}: {{.Status}}' 2>/dev/null | grep -E 'vereins-|festschmiede' || echo '  (keine)')\n"
  s+="\nHealth:\n"
  if curl -fsS http://localhost:3001/api/health >/dev/null 2>&1; then
    s+="  Backend:  OK\n"
  else
    s+="  Backend:  nicht erreichbar\n"
  fi
  echo -e "$s"
}
