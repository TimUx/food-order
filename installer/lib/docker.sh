#!/usr/bin/env bash
# FestSchmiede Installer – Docker-Installation und -Betrieb

install_docker_if_missing() {
  [[ "${SYS_DETECT[docker_installed]}" == "yes" ]] && return 0

  log_info "Docker nicht gefunden – Installation anbieten"
  if ! tui_yesno "Docker installieren" "Docker ist nicht installiert.

Soll Docker jetzt installiert werden?
(Unterstützt: Debian/Ubuntu via get.docker.com)"; then
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
  if [[ "${CFG[USE_REDIS]:-no}" == "internal" || "${CFG[USE_REDIS]:-no}" == "yes" ]]; then
    profiles+=(--profile redis)
  fi

  log_info "Starte Container..."
  log_info "Compose: ${COMPOSE_CMD[*]} ${COMPOSE_FILES[*]} ${profiles[*]}"
  (cd "$INSTALL_DIR" && "${COMPOSE_CMD[@]}" "${COMPOSE_FILES[@]}" "${profiles[@]}" up -d) >>"$LOG_FILE" 2>&1
}

compose_down() {
  log_info "Stoppe Container..."
  (cd "$INSTALL_DIR" && "${COMPOSE_CMD[@]}" "${COMPOSE_FILES[@]}" down) >>"$LOG_FILE" 2>&1 || true
}

stack_name() {
  echo "${CFG[STACK_NAME]:-festschmiede}"
}

stack_down() {
  local stack
  stack="$(stack_name)"
  if docker stack ls --format '{{.Name}}' 2>/dev/null | grep -qx "$stack"; then
    log_info "Entferne Swarm-Stack: ${stack}"
    docker stack rm "$stack" >>"$LOG_FILE" 2>&1 || true
    local i
    for ((i=1; i<=60; i++)); do
      docker stack ps "$stack" >/dev/null 2>&1 || break
      sleep 1
    done
  fi
}

deployment_down() {
  apply_defaults
  if deployment_uses_swarm; then
    stack_down
  else
    build_compose_files
    compose_down
  fi
}

stack_pull() {
  apply_defaults
  local image_prefix="${CFG[GHCR_IMAGE_PREFIX]}"
  local image_tag="${CFG[IMAGE_TAG]}"
  local images=(
    "${image_prefix}/backend:${image_tag}"
    "${image_prefix}/frontend:${image_tag}"
  )
  if [[ "${CFG[DB_MODE]:-internal}" == "internal" ]]; then
    images+=("postgres:16-alpine")
  fi
  if [[ "${CFG[USE_REDIS]:-no}" == "internal" ]]; then
    images+=("redis:7-alpine")
  fi

  log_info "Lade Docker-Images für Swarm..."
  local img
  for img in "${images[@]}"; do
    docker pull "$img" >>"$LOG_FILE" 2>&1 || return 1
  done
}

swarm_stack_services_running() {
  local stack svc
  stack="$(stack_name)"
  for svc in backend frontend; do
    if ! docker service ps -q -f desired-state=running "$(swarm_service_name "$svc")" 2>/dev/null | grep -q .; then
      return 1
    fi
  done
  return 0
}

stack_deploy() {
  local stack_file
  stack_file="$(swarm_stack_publish_path)"
  [[ -f "$stack_file" ]] || { log_error "stack.yml fehlt: $stack_file"; return 1; }
  local stack attempt deploy_ok=0
  stack="$(stack_name)"
  log_info "Deploye Swarm-Stack: ${stack}"

  for attempt in 1 2 3; do
    if docker stack deploy --detach=true --with-registry-auth -c "$stack_file" "$stack" >>"$LOG_FILE" 2>&1; then
      deploy_ok=1
      break
    fi
    if swarm_stack_services_running; then
      log_warn "stack deploy RPC-Fehler (Versuch ${attempt}/3), Services laufen jedoch — fahre fort"
      deploy_ok=1
      break
    fi
    log_warn "stack deploy fehlgeschlagen (Versuch ${attempt}/3) — erneuter Versuch in 10s"
    sleep 10
  done

  [[ $deploy_ok -eq 1 ]] || return 1
  return 0
}

swarm_service_name() {
  echo "$(stack_name)_${1}"
}

swarm_task_container_id() {
  local svc="$1"
  local task_id
  task_id=$(docker service ps -q -f desired-state=running "$svc" 2>/dev/null | head -1)
  [[ -n "$task_id" ]] || return 1
  docker inspect "$task_id" --format '{{if .Status.ContainerStatus}}{{.Status.ContainerStatus.ContainerID}}{{end}}' 2>/dev/null
}

container_health_ok_by_id() {
  local cid="$1"
  [[ -n "$cid" ]] || return 1
  local status
  status=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || echo "")
  [[ "$status" == "healthy" || "$status" == "running" ]]
}

wait_for_swarm_health() {
  local timeout="${1:-180}"
  local backend_svc frontend_svc backend_cid frontend_cid
  backend_svc="$(swarm_service_name backend)"
  frontend_svc="$(swarm_service_name frontend)"
  log_info "Warte auf Swarm-Services (max. ${timeout}s)..."

  local i
  for ((i=1; i<=timeout; i++)); do
    tui_gauge "Installation" $((i * 50 / timeout)) "Warte auf Backend... (${i}s)"
    backend_cid=$(swarm_task_container_id "$backend_svc" || true)
    if container_health_ok_by_id "$backend_cid"; then
      log_info "Backend bereit nach ${i}s (Service: ${backend_svc})"
      break
    fi
    [[ $i -eq $timeout ]] && { log_error "Backend-Timeout (Service: ${backend_svc})"; return 1; }
    sleep 1
  done

  for ((i=1; i<=60; i++)); do
    tui_gauge "Installation" $((50 + i * 50 / 60)) "Warte auf Frontend... (${i}s)"
    frontend_cid=$(swarm_task_container_id "$frontend_svc" || true)
    if container_health_ok_by_id "$frontend_cid"; then
      log_info "Frontend bereit nach ${i}s (Service: ${frontend_svc})"
      return 0
    fi
    sleep 1
  done

  log_warn "Frontend-Service nicht healthy (${frontend_svc}) — prüfen Sie Traefik/DNS falls Reverse Proxy aktiv"
  return 0
}

reset_postgres_volume_if_requested() {
  [[ "${CFG[RESET_POSTGRES_VOLUME]:-}" == "yes" ]] || return 0
  local vol="${CFG[POSTGRES_VOLUME_NAME]:-${SYS_DETECT[postgres_volume_name]:-}}"
  [[ -n "$vol" ]] || return 0

  log_info "Entferne PostgreSQL-Volume: ${vol}"
  deployment_down
  if ! docker volume rm "$vol" >>"$LOG_FILE" 2>&1; then
    log_error "PostgreSQL-Volume konnte nicht entfernt werden: ${vol}"
    return 1
  fi
  SYS_DETECT[postgres_volume]="no"
  SYS_DETECT[postgres_volume_name]=""
  return 0
}

resolve_public_api_health_url() {
  apply_defaults
  if [[ "${CFG[INSTALL_PROFILE]:-}" != "production" || -z "${CFG[PLATFORM_DOMAIN]:-}" ]]; then
    return 1
  fi
  if [[ "${CFG[ENABLE_APP_HOST]:-yes}" == "yes" ]]; then
    echo "https://${CFG[APP_SUBDOMAIN]:-app}.${CFG[PLATFORM_DOMAIN]}/api/health"
    return 0
  fi
  if [[ "${CFG[ENABLE_WWW_HOST]:-yes}" == "yes" ]]; then
    echo "https://${CFG[WWW_SUBDOMAIN]:-www}.${CFG[PLATFORM_DOMAIN]}/api/health"
    return 0
  fi
  echo "https://${CFG[PLATFORM_DOMAIN]}/api/health"
  return 0
}

host_can_reach_backend_port() {
  apply_defaults
  [[ "${CFG[INSTALL_PROFILE]:-}" == "local" ]]
}

parse_health_response_ok() {
  local body="$1"
  local status db_ok
  [[ -n "$body" ]] || return 1
  status=$(echo "$body" | grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
  db_ok=$(echo "$body" | grep -oE '"database"[[:space:]]*:[[:space:]]*\{[^}]*"ok"[[:space:]]*:[[:space:]]*true' | head -1 || true)
  [[ "$status" == "ok" && -n "$db_ok" ]]
}

parse_health_database_ok() {
  local body="$1"
  [[ -n "$body" ]] || return 1
  echo "$body" | grep -qE '"database"[[:space:]]*:[[:space:]]*\{[^}]*"ok"[[:space:]]*:[[:space:]]*true'
}

fetch_public_https_health_body() {
  local url body
  url=$(resolve_public_api_health_url) || return 1
  body=$(curl -kfsS "$url" 2>/dev/null || true)
  if [[ -n "$body" ]]; then
    printf '%s' "$body"
    return 0
  fi
  return 1
}

fetch_internal_backend_health_body() {
  apply_defaults
  local backend_host backend_port frontend_id backend_cid body=""
  backend_host="${CFG[BACKEND_HOST]:-backend}"
  backend_port="${CFG[BACKEND_PORT]:-3001}"

  if deployment_uses_swarm; then
    backend_cid=$(swarm_task_container_id "$(swarm_service_name backend)" || true)
    if [[ -n "$backend_cid" ]]; then
      body=$(docker exec "$backend_cid" wget -q -O- "http://127.0.0.1:${backend_port}/api/health" 2>/dev/null || true)
      if [[ -n "$body" ]]; then
        printf '%s' "$body"
        return 0
      fi
    fi
  fi

  if host_can_reach_backend_port; then
    body=$(curl -fsS "http://localhost:${backend_port}/api/health" 2>/dev/null || true)
    if [[ -n "$body" ]]; then
      printf '%s' "$body"
      return 0
    fi
  fi

  frontend_id=$(find_frontend_container_id)
  if [[ -n "$frontend_id" ]]; then
    body=$(docker exec "$frontend_id" wget -q -O- "http://${backend_host}:${backend_port}/api/health" 2>/dev/null || true)
    if [[ -n "$body" ]]; then
      printf '%s' "$body"
      return 0
    fi
  fi

  return 1
}

find_frontend_container_id() {
  apply_defaults
  local name="${CFG[FRONTEND_CONTAINER]:-festschmiede-frontend}"
  if deployment_uses_swarm; then
    docker ps -q -f "label=com.docker.swarm.service.name=$(stack_name)_frontend" 2>/dev/null | head -1
    return 0
  fi
  docker ps -q -f "name=^/${name}$" 2>/dev/null | head -1
}

fetch_backend_health_body() {
  apply_defaults
  local body=""

  if [[ "${CFG[INSTALL_PROFILE]:-}" == "production" ]]; then
    body=$(fetch_public_https_health_body 2>/dev/null || true)
    if [[ -n "$body" ]]; then
      printf '%s' "$body"
      return 0
    fi
    body=$(fetch_internal_backend_health_body 2>/dev/null || true)
    if [[ -n "$body" ]]; then
      printf '%s' "$body"
      return 0
    fi
    return 1
  fi

  body=$(fetch_internal_backend_health_body 2>/dev/null || true)
  if [[ -n "$body" ]]; then
    printf '%s' "$body"
    return 0
  fi
  return 1
}

backend_health_ok() {
  local body backend_container
  apply_defaults
  if [[ "${CFG[INSTALL_PROFILE]:-}" == "production" ]]; then
    body=$(fetch_public_https_health_body 2>/dev/null || true)
    parse_health_response_ok "$body" && return 0
    return 1
  fi

  body=$(fetch_backend_health_body) || {
    backend_container="${CFG[BACKEND_CONTAINER]:-festschmiede-backend}"
    container_health_ok "$backend_container"
    return $?
  }
  parse_health_response_ok "$body"
}

describe_backend_health_probe() {
  apply_defaults
  local url backend_host backend_port
  backend_host="${CFG[BACKEND_HOST]:-backend}"
  backend_port="${CFG[BACKEND_PORT]:-3001}"
  if url=$(resolve_public_api_health_url 2>/dev/null); then
    echo "$url (Traefik → Frontend → Backend)"
    return 0
  fi
  if host_can_reach_backend_port; then
    echo "http://localhost:${backend_port}/api/health"
    return 0
  fi
  echo "http://${backend_host}:${backend_port}/api/health (intern via Frontend-Container)"
}

container_health_ok() {
  local name="$1"
  local status
  status=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$name" 2>/dev/null || echo "")
  [[ "$status" == "healthy" ]]
}

wait_for_health() {
  if deployment_uses_swarm; then
    wait_for_swarm_health "$@"
    return $?
  fi

  local timeout="${1:-180}"
  local backend_container="${CFG[BACKEND_CONTAINER]:-festschmiede-backend}"
  local frontend_container="${CFG[FRONTEND_CONTAINER]:-festschmiede-frontend}"
  log_info "Warte auf Container-Health (max. ${timeout}s)..."

  local i
  for ((i=1; i<=timeout; i++)); do
    tui_gauge "Installation" $((i * 50 / timeout)) "Warte auf Backend... (${i}s)"
    if container_health_ok "$backend_container"; then
      log_info "Backend bereit nach ${i}s (Container: ${backend_container})"
      break
    fi
    [[ $i -eq $timeout ]] && { log_error "Backend-Timeout (Container: ${backend_container})"; return 1; }
    sleep 1
  done

  for ((i=1; i<=60; i++)); do
    tui_gauge "Installation" $((50 + i * 50 / 60)) "Warte auf Frontend... (${i}s)"
    if container_health_ok "$frontend_container"; then
      log_info "Frontend bereit nach ${i}s (Container: ${frontend_container})"
      return 0
    fi
    sleep 1
  done

  log_warn "Frontend-Container nicht healthy (${frontend_container}) — prüfen Sie Traefik/DNS falls Reverse Proxy aktiv"
  return 0
}

run_installation() {
  local step=0
  local total=7

  tui_gauge "Installation" 0 "Vorbereitung..."
  install_docker_if_missing || return 1
  step=$((step+1))

  if [[ "$INSTALL_MODE" != "config" ]]; then
    tui_gauge "Installation" $((step*100/total)) "Generiere Konfiguration..."
    generate_deployment_config
    generate_env_file
    if deployment_uses_swarm; then
      ensure_swarm_secrets
    else
      build_compose_files
    fi
    step=$((step+1))

    tui_gauge "Installation" $((step*100/total)) "Lade Images..."
    if deployment_uses_swarm; then
      stack_pull || return 1
    else
      compose_pull || return 1
    fi
    step=$((step+1))

    tui_gauge "Installation" $((step*100/total)) "Datenbank-Backup..."
    run_pre_migration_backup || return 1
    step=$((step+1))

    tui_gauge "Installation" $((step*100/total)) "Starte Services..."
    reset_postgres_volume_if_requested || return 1
    if deployment_uses_swarm; then
      stack_deploy || return 1
    else
      compose_up || return 1
    fi
    step=$((step+1))

    tui_gauge "Installation" $((step*100/total)) "Health-Check..."
    wait_for_health || return 1
  else
    generate_deployment_config
    generate_env_file
    if deployment_uses_swarm; then
      stack_deploy || return 1
    else
      build_compose_files
      compose_up || return 1
    fi
  fi

  tui_gauge "Installation" 100 "Abgeschlossen"
  log_info "Installation erfolgreich abgeschlossen"
  return 0
}

docker_status_report() {
  local s="" containers
  apply_defaults
  if deployment_uses_swarm; then
    s+="Swarm-Stack: $(stack_name)"
    containers=$(docker stack ps "$(stack_name)" --format '  {{.Name}}: {{.CurrentState}}' 2>/dev/null | head -6 || echo '  (keine)')
    s+=$'\n'"${containers}"
  else
    s+="Container:"
    containers=$(docker ps --format '  {{.Names}}: {{.Status}}' 2>/dev/null | grep -E 'vereins-|festschmiede' || echo '  (keine)')
    s+=$'\n'"${containers}"
  fi
  s+=$'\n\n'"Health:"
  if backend_health_ok; then
    s+=$'\n'"  Backend:  OK"
  else
    s+=$'\n'"  Backend:  nicht erreichbar ($(describe_backend_health_probe))"
  fi
  printf '%s' "$s"
}

deployment_up() {
  apply_defaults
  if deployment_uses_swarm; then
    generate_deployment_config
    stack_pull || return 1
    stack_deploy || return 1
  else
    build_compose_files
    compose_pull || return 1
    compose_up || return 1
  fi
}
