#!/usr/bin/env bash
# FestSchmiede Installer – Konfigurationsgenerierung (.env, compose)

load_postgres_credentials_from_file() {
  local env_file="$1"
  local key value
  [[ -f "$env_file" ]] || return 1
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^(POSTGRES_USER|POSTGRES_PASSWORD|POSTGRES_DB)$ ]] || continue
    value="${value%$'\r'}"
    value="${value#\"}"; value="${value%\"}"
    CFG["$key"]="$value"
  done < <(grep -E '^POSTGRES_(USER|PASSWORD|DB)=' "$env_file" 2>/dev/null || true)
  [[ -n "${CFG[POSTGRES_PASSWORD]:-}" ]]
}

find_postgres_credentials_backup() {
  local oldest=""
  oldest=$(ls -td "${BACKUP_DIR}"/pre-install-* 2>/dev/null | tail -1)
  if [[ -n "$oldest" && -f "${oldest}/.env" ]]; then
    echo "${oldest}/.env"
    return 0
  fi
  if [[ -f "${INSTALL_DIR}/.env" ]]; then
    echo "${INSTALL_DIR}/.env"
    return 0
  fi
  return 1
}

resolve_postgres_volume_strategy() {
  detect_postgres_volume
  [[ "${CFG[DB_MODE]:-internal}" == "internal" ]] || return 0
  [[ "${SYS_DETECT[postgres_volume]:-no}" == "yes" ]] || return 0

  local vol="${SYS_DETECT[postgres_volume_name]}"
  local cred_file="" msg

  msg="Es existiert bereits ein PostgreSQL-Daten-Volume:
  ${vol}

PostgreSQL initialisiert Benutzer und Passwort nur beim ersten Start.
Ein neues Passwort in der .env führt sonst zu P1000-Authentifizierungsfehlern."

  if cred_file=$(find_postgres_credentials_backup); then
    msg="${msg}

Vorhandene Zugangsdaten aus ${cred_file} können übernommen werden."
    if tui_yesno "Datenbank-Volume" "${msg}

Vorhandene Datenbank-Daten und Zugangsdaten behalten?"; then
      load_postgres_credentials_from_file "$cred_file" || {
        tui_msgbox "Fehler" "Zugangsdaten konnten nicht aus ${cred_file} gelesen werden."
        return 1
      }
      CFG[REUSE_POSTGRES_CREDENTIALS]="yes"
      CFG[POSTGRES_VOLUME_NAME]="$vol"
      log_info "PostgreSQL-Zugangsdaten aus ${cred_file} übernommen (Volume: ${vol})"
      return 0
    fi
  else
    msg="${msg}

Keine frühere .env mit Zugangsdaten gefunden."
    if ! tui_yesno "Datenbank-Volume" "${msg}

Datenbank-Volume zurücksetzen (alle Daten löschen)?"; then
      WIZARD_CANCELLED=1
      return 1
    fi
    CFG[RESET_POSTGRES_VOLUME]="yes"
    CFG[POSTGRES_VOLUME_NAME]="$vol"
    log_info "PostgreSQL-Volume wird zurückgesetzt: ${vol}"
    return 0
  fi

  if tui_yesno "Datenbank löschen" "Alle PostgreSQL-Daten im Volume ${vol} werden unwiderruflich gelöscht!

Fortfahren?"; then
    CFG[RESET_POSTGRES_VOLUME]="yes"
    CFG[POSTGRES_VOLUME_NAME]="$vol"
    log_info "PostgreSQL-Volume wird zurückgesetzt: ${vol}"
    return 0
  fi

  WIZARD_CANCELLED=1
  return 1
}

apply_defaults() {
  CFG[POSTGRES_USER]="${CFG[POSTGRES_USER]:-festschmiede}"
  CFG[POSTGRES_DB]="${CFG[POSTGRES_DB]:-festschmiede}"
  CFG[GHCR_IMAGE_PREFIX]="${CFG[GHCR_IMAGE_PREFIX]:-ghcr.io/timux/festschmiede}"
  CFG[IMAGE_TAG]="${CFG[IMAGE_TAG]:-latest}"
  CFG[JWT_EXPIRES_IN]="${CFG[JWT_EXPIRES_IN]:-8h}"
  CFG[DEFAULT_TENANT_SLUG]="${CFG[DEFAULT_TENANT_SLUG]:-default}"
  CFG[TRUSTED_PROXY_HOPS]="${CFG[TRUSTED_PROXY_HOPS]:-2}"
  CFG[LOG_FORMAT]="${CFG[LOG_FORMAT]:-json}"
  CFG[PLATFORM_NAME]="${CFG[PLATFORM_NAME]:-FestSchmiede}"
  CFG[PLATFORM_LOCALE]="${CFG[PLATFORM_LOCALE]:-de-DE}"
  CFG[PLATFORM_TIMEZONE]="${CFG[PLATFORM_TIMEZONE]:-Europe/Berlin}"
  CFG[DOCKER_INTERNAL_NETWORK]="${CFG[DOCKER_INTERNAL_NETWORK]:-${CFG[FESTSCHMIEDE_INTERNAL_NETWORK]:-festschmiede_internal}}"
  CFG[DOCKER_PROXY_NETWORK]="${CFG[DOCKER_PROXY_NETWORK]:-${CFG[FESTSCHMIEDE_PROXY_NETWORK]:-${CFG[DOCKER_NETWORK]:-festschmiede_public}}}"
  CFG[DOCKER_NETWORK_CREATE]="${CFG[DOCKER_NETWORK_CREATE]:-yes}"
  CFG[USES_REVERSE_PROXY]="${CFG[USES_REVERSE_PROXY]:-no}"
  CFG[DEPLOYMENT_MODE]="${CFG[DEPLOYMENT_MODE]:-compose}"
  CFG[STACK_NAME]="${CFG[STACK_NAME]:-festschmiede}"
  CFG[BACKEND_HOST]="${CFG[BACKEND_HOST]:-backend}"
  CFG[BACKEND_PORT]="${CFG[BACKEND_PORT]:-3001}"
  CFG[BACKEND_CONTAINER]="${CFG[BACKEND_CONTAINER]:-festschmiede-backend}"
  CFG[FRONTEND_CONTAINER]="${CFG[FRONTEND_CONTAINER]:-festschmiede-frontend}"

  # Legacy: PROXY_MODE=existing → externer Proxy ohne Typ
  if [[ "${CFG[PROXY_MODE]:-}" == "existing" ]]; then
    CFG[PROXY_DEPLOYMENT]="external"
    CFG[PROXY_MODE]="${CFG[EXISTING_PROXY_TYPE]:-other}"
  fi
  if [[ -z "${CFG[PROXY_DEPLOYMENT]:-}" ]]; then
    case "${CFG[PROXY_MODE]:-none}" in
      none) CFG[PROXY_DEPLOYMENT]="none" ;;
      traefik) CFG[PROXY_DEPLOYMENT]="bundled" ;;
      nginx) CFG[PROXY_DEPLOYMENT]="manual" ;;
      *) CFG[PROXY_DEPLOYMENT]="external" ;;
    esac
  fi

  # Legacy .env ohne PROXY_MODE: Produktionsprofil → gebündelter Traefik
  if [[ -z "${CFG[PROXY_MODE]:-}" && "${CFG[INSTALL_PROFILE]:-}" == "production" ]]; then
    CFG[PROXY_MODE]="traefik"
    CFG[PROXY_DEPLOYMENT]="bundled"
  fi
  if [[ "${CFG[PROXY_MODE]:-none}" != "none" ]]; then
    CFG[USES_REVERSE_PROXY]="yes"
  fi

  if [[ "${CFG[INSTALL_PROFILE]:-}" != "production" ]] && [[ "${CFG[USES_REVERSE_PROXY]:-no}" == "yes" && "${CFG[PROXY_DEPLOYMENT]:-}" != "none" ]]; then
    CFG[INSTALL_PROFILE]="production"
  fi

  if [[ "${CFG[INSTALL_PROFILE]:-}" == "production" ]]; then
    CFG[MULTI_TENANT_ENABLED]="${CFG[MULTI_TENANT_ENABLED]:-true}"
    CFG[PLATFORM_DOMAIN]="${CFG[PLATFORM_DOMAIN]:-festschmiede.local}"
    CFG[WWW_SUBDOMAIN]="${CFG[WWW_SUBDOMAIN]:-www}"
    CFG[APP_SUBDOMAIN]="${CFG[APP_SUBDOMAIN]:-app}"
    CFG[API_SUBDOMAIN]="${CFG[API_SUBDOMAIN]:-api}"
    CFG[PLATFORM_API_DOMAIN]=""
    CFG[ACME_EMAIL]="${CFG[ACME_EMAIL]:-admin@${CFG[PLATFORM_DOMAIN]}}"
    migrate_traefik_tls_model
    if [[ "${CFG[ENABLE_APP_HOST]:-yes}" == "yes" ]]; then
      CFG[CORS_ORIGIN]="https://${CFG[APP_SUBDOMAIN]:-app}.${CFG[PLATFORM_DOMAIN]}"
    else
      CFG[CORS_ORIGIN]="https://${CFG[PLATFORM_DOMAIN]}"
    fi
    # Same-Origin: Frontend-nginx leitet /api/ und /socket.io/ intern weiter
    CFG[VITE_API_URL]=""
    CFG[VITE_WS_URL]=""
    CFG[PLATFORM_ALLOWED_ORIGINS]="$(build_production_allowed_origins)"
  else
    CFG[MULTI_TENANT_ENABLED]="false"
    CFG[PLATFORM_DOMAIN]="${CFG[PLATFORM_DOMAIN]:-localhost}"
    CFG[CORS_ORIGIN]="${CFG[CORS_ORIGIN]:-http://localhost:5173}"
    CFG[VITE_API_URL]="${CFG[VITE_API_URL]:-http://localhost:3001}"
    CFG[VITE_WS_URL]="${CFG[VITE_WS_URL]:-http://localhost:3001}"
  fi
}

compose_override_source_path() {
  echo "${INSTALL_DIR}/installer/generated/compose.override.yml"
}

compose_override_publish_path() {
  echo "${INSTALL_DIR}/docker-compose.override.yml"
}

publish_compose_override() {
  local source="$1"
  local published
  published="$(compose_override_publish_path)"
  cp "$source" "$published"
  log_info "Compose-Override veröffentlicht: $published"
}

resolve_compose_override_file() {
  local published
  published="$(compose_override_publish_path)"
  if [[ -f "$published" ]]; then
    echo "$published"
    return 0
  fi
  if [[ -f "$(compose_override_source_path)" ]]; then
    echo "$(compose_override_source_path)"
    return 0
  fi
  return 1
}

build_compose_files() {
  local override_file=""
  COMPOSE_FILES=("-f" "${INSTALL_DIR}/docker-compose.yml")

  apply_defaults
  if [[ "${CFG[PROXY_MODE]:-none}" == "traefik" && "${CFG[PROXY_DEPLOYMENT]:-}" == "bundled" ]]; then
    COMPOSE_FILES+=("-f" "${INSTALL_DIR}/docker-compose.prod.yml")
  fi

  if override_file=$(resolve_compose_override_file); then
    COMPOSE_FILES+=("-f" "$override_file")
  fi
}

proxy_uses_traefik_network() {
  [[ "${CFG[PROXY_MODE]:-none}" == "traefik" ]]
}

proxy_generates_traefik_labels() {
  [[ "${CFG[PROXY_MODE]:-none}" == "traefik" && "${CFG[PROXY_DEPLOYMENT]:-}" == "external" ]]
}

proxy_generates_config_files() {
  local mode="${CFG[PROXY_MODE]:-none}"
  [[ "${CFG[USES_REVERSE_PROXY]:-no}" == "yes" ]] || return 1
  [[ "$mode" =~ ^(nginx|caddy|apache|haproxy)$ ]]
}

deployment_uses_swarm() {
  [[ "${CFG[DEPLOYMENT_MODE]:-compose}" == "swarm" ]]
}

swarm_stack_generated_path() {
  echo "${INSTALL_DIR}/installer/generated/stack.yml"
}

swarm_stack_publish_path() {
  echo "${INSTALL_DIR}/stack.yml"
}

escape_yaml_value() {
  printf '%s' "$1" | sed 's/"/\\"/g'
}

escape_stack_value() {
  # Swarm/Compose-Interpolation: $ muss als $$ geschrieben werden
  printf '%s' "$1" | sed -e 's/"/\\"/g' -e 's/\$/$$/g'
}

build_traefik_host_rule() {
  local mode="${1:-compose}"
  local domain="${CFG[PLATFORM_DOMAIN]}"
  local parts=() part rule=""

  if [[ "${CFG[ENABLE_WWW_HOST]:-yes}" == "yes" ]]; then
    parts+=("Host(\`${CFG[WWW_SUBDOMAIN]:-www}.${domain}\`)")
  fi
  if [[ "${CFG[ENABLE_APP_HOST]:-yes}" == "yes" ]]; then
    parts+=("Host(\`${CFG[APP_SUBDOMAIN]:-app}.${domain}\`)")
  fi

  for part in "${parts[@]}"; do
    [[ -n "$rule" ]] && rule+=" || "
    rule+="$part"
  done
  printf '%s' "$rule"
}

build_production_allowed_origins() {
  local domain="${CFG[PLATFORM_DOMAIN]}"
  local origins=()
  if [[ "${CFG[ENABLE_WWW_HOST]:-yes}" == "yes" ]]; then
    origins+=("https://${CFG[WWW_SUBDOMAIN]:-www}.${domain}")
  fi
  if [[ "${CFG[ENABLE_APP_HOST]:-yes}" == "yes" ]]; then
    origins+=("https://${CFG[APP_SUBDOMAIN]:-app}.${domain}")
  fi
  local IFS=,
  echo "${origins[*]}"
}

build_nginx_server_names() {
  local domain="${CFG[PLATFORM_DOMAIN]}"
  local names=""
  if [[ "${CFG[ENABLE_WWW_HOST]:-yes}" == "yes" ]]; then
    names+="${CFG[WWW_SUBDOMAIN]:-www}.${domain}"
  fi
  if [[ "${CFG[ENABLE_APP_HOST]:-yes}" == "yes" ]]; then
    [[ -n "$names" ]] && names+=" "
    names+="${CFG[APP_SUBDOMAIN]:-app}.${domain}"
  fi
  printf '%s' "$names"
}

migrate_traefik_tls_model() {
  # Rückwärtskompatibilität: alte Installationen ohne Host-Flags
  if [[ -z "${CFG[ENABLE_WWW_HOST]:-}" ]]; then
    CFG[ENABLE_WWW_HOST]="yes"
  fi
  if [[ -z "${CFG[ENABLE_APP_HOST]:-}" ]]; then
    CFG[ENABLE_APP_HOST]="yes"
  fi

  # Pfad-basiertes Mandanten-Routing (v2.0): Multi-Tenant unabhängig von Subdomain-Hosts
  if [[ "${CFG[INSTALL_PROFILE]:-}" == "production" ]]; then
    CFG[MULTI_TENANT_ENABLED]="true"
  fi

  CFG[TRAEFIK_CERT_RESOLVER]="${CFG[TRAEFIK_CERT_RESOLVER]:-le}"

  CFG[PLATFORM_WWW_DOMAIN]=""
  [[ "${CFG[ENABLE_WWW_HOST]}" == "yes" ]] && CFG[PLATFORM_WWW_DOMAIN]="${CFG[WWW_SUBDOMAIN]:-www}.${CFG[PLATFORM_DOMAIN]}"
  CFG[PLATFORM_APP_DOMAIN]=""
  [[ "${CFG[ENABLE_APP_HOST]}" == "yes" ]] && CFG[PLATFORM_APP_DOMAIN]="${CFG[APP_SUBDOMAIN]:-app}.${CFG[PLATFORM_DOMAIN]}"
  CFG[PLATFORM_API_DOMAIN]=""

  CFG[PLATFORM_WILDCARD_DOMAIN]=""
  unset 'CFG[ENABLE_TENANT_HOSTS]'

  if [[ "${CFG[INSTALL_PROFILE]:-}" == "production" && -n "${CFG[PLATFORM_DOMAIN]:-}" ]]; then
    CFG[TRAEFIK_ROUTER_RULE]="$(build_traefik_host_rule compose)"
    CFG[TRAEFIK_ROUTER_RULE_SWARM]="$(build_traefik_host_rule swarm)"
  fi
}

regenerate_deployment_from_env() {
  load_existing_env
  apply_defaults
  migrate_traefik_tls_model
  generate_deployment_config
  generate_env_file
  log_info "Deployment-Konfiguration migriert (Pfad-basiertes Mandanten-Routing, Per-Host-TLS)"
}

_write_traefik_tls_labels() {
  local indent="${1:-      }"
  local resolver="${CFG[TRAEFIK_CERT_RESOLVER]:-le}"
  printf '%s- traefik.http.routers.festschmiede.tls=true\n' "$indent"
  if [[ "${CFG[HTTPS_ENABLED]:-no}" == "yes" || "${CFG[INSTALL_PROFILE]:-}" == "production" ]]; then
    printf '%s- traefik.http.routers.festschmiede.tls.certresolver=%s\n' "$indent" "$resolver"
  fi
}

_swarm_node_placement_yaml() {
  local node_id="${CFG[SWARM_NODE_ID]:-}"
  local node_hostname="${CFG[SWARM_NODE_HOSTNAME]:-}"
  cat <<'EOF'
      placement:
        constraints:
EOF
  if [[ -n "$node_id" ]]; then
    echo "          - node.id == ${node_id}"
  elif [[ -n "$node_hostname" ]]; then
    echo "          - node.hostname == ${node_hostname}"
  else
    echo "          - node.role == manager"
  fi
}

_write_swarm_traefik_deploy_labels() {
  local proxy_net="${CFG[DOCKER_PROXY_NETWORK]}"
  local rule="${CFG[TRAEFIK_ROUTER_RULE_SWARM]:-$(build_traefik_host_rule swarm)}"

  cat <<EOF
      labels:
        - traefik.enable=true
        - traefik.docker.network=${proxy_net}
        - traefik.http.routers.festschmiede.rule=${rule}
        - traefik.http.routers.festschmiede.entrypoints=websecure
EOF
  _write_traefik_tls_labels "        "
  cat <<EOF
        - traefik.http.routers.festschmiede.service=festschmiede
        - traefik.http.services.festschmiede.loadbalancer.server.port=80
        - traefik.http.middlewares.festschmiede-headers.headers.sslredirect=true
        - traefik.http.middlewares.festschmiede-headers.headers.stsSeconds=31536000
        - traefik.http.routers.festschmiede.middlewares=festschmiede-headers
EOF
}

generate_swarm_stack() {
  apply_defaults
  local out="${INSTALL_DIR}/installer/generated"
  mkdir -p "$out"
  local file
  file="$(swarm_stack_generated_path)"
  local published
  published="$(swarm_stack_publish_path)"
  local stack_name="${CFG[STACK_NAME]:-festschmiede}"
  local internal_net="${CFG[DOCKER_INTERNAL_NETWORK]}"
  local proxy_net="${CFG[DOCKER_PROXY_NETWORK]}"
  local use_proxy="${CFG[USES_REVERSE_PROXY]:-no}"
  local proxy_mode="${CFG[PROXY_MODE]:-none}"
  local db_mode="${CFG[DB_MODE]:-internal}"
  local use_redis="${CFG[USE_REDIS]:-no}"
  local image_prefix="${CFG[GHCR_IMAGE_PREFIX]}"
  local image_tag="${CFG[IMAGE_TAG]}"
  local domain="${CFG[PLATFORM_DOMAIN]}"

  local db_user db_name db_pass jwt_sec enc_key admin_pass admin_email cors allowed
  local www_domain app_domain
  db_user="$(escape_stack_value "${CFG[POSTGRES_USER]}")"
  db_name="$(escape_stack_value "${CFG[POSTGRES_DB]}")"
  db_pass="$(escape_stack_value "${CFG[POSTGRES_PASSWORD]}")"
  jwt_sec="$(escape_stack_value "${CFG[JWT_SECRET]}")"
  enc_key="$(escape_stack_value "${CFG[APP_ENCRYPTION_KEY]}")"
  admin_pass="$(escape_stack_value "${CFG[PLATFORM_ADMIN_PASSWORD]}")"
  admin_email="$(escape_stack_value "${CFG[PLATFORM_ADMIN_EMAIL]:-platform@festschmiede.local}")"
  cors="$(escape_stack_value "${CFG[CORS_ORIGIN]}")"
  allowed="$(escape_stack_value "${CFG[PLATFORM_ALLOWED_ORIGINS]:-}")"
  www_domain="$(escape_stack_value "${CFG[PLATFORM_WWW_DOMAIN]:-}")"
  app_domain="$(escape_stack_value "${CFG[PLATFORM_APP_DOMAIN]:-}")"

  local database_url redis_env="" smtp_env="" postgres_service="" redis_service="" secrets_block=""
  if [[ "$db_mode" == "internal" ]]; then
    database_url="postgresql://${db_user}:${db_pass}@postgres:5432/${db_name}"
    postgres_service="
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${db_user}
      POSTGRES_PASSWORD: \"${db_pass}\"
      POSTGRES_DB: ${db_name}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - internal
    deploy:
      replicas: 1
$(_swarm_node_placement_yaml)
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: \"2\"
          memory: 1G
        reservations:
          memory: 256M
    healthcheck:
      test: [\"CMD-SHELL\", \"pg_isready -U ${db_user} -d ${db_name}\"]
      interval: 5s
      timeout: 5s
      retries: 10"
  else
    database_url="$(escape_stack_value "${CFG[DATABASE_URL]}")"
  fi

  if [[ "$use_redis" == "internal" ]]; then
    redis_env="      REDIS_URL: \"redis://redis:6379\""
    redis_service="
  redis:
    image: redis:7-alpine
    command: [\"redis-server\", \"--appendonly\", \"yes\"]
    volumes:
      - redis_data:/data
    networks:
      - internal
    deploy:
      replicas: 1
$(_swarm_node_placement_yaml)
      restart_policy:
        condition: on-failure
    healthcheck:
      test: [\"CMD\", \"redis-cli\", \"ping\"]
      interval: 10s
      timeout: 3s
      retries: 5"
    secrets_block="
  redis_data:"
  elif [[ "$use_redis" == "external" && -n "${CFG[REDIS_URL]:-}" ]]; then
    redis_env="      REDIS_URL: \"$(escape_stack_value "${CFG[REDIS_URL]}")\""
  fi

  if [[ "${CFG[SMTP_ENABLED]:-no}" == "yes" ]]; then
    smtp_env="      INSTALL_SMTP_HOST: \"$(escape_stack_value "${CFG[SMTP_HOST]:-}")\"
      INSTALL_SMTP_PORT: \"${CFG[SMTP_PORT]:-587}\""
  fi

  local frontend_networks frontend_ports="" backend_ports="" frontend_labels=""
  if [[ "$use_proxy" == "yes" ]]; then
    if proxy_uses_traefik_network; then
      frontend_networks="      - internal
      - traefik_network"
      if proxy_generates_traefik_labels; then
        frontend_labels="$(_write_swarm_traefik_deploy_labels)"
      fi
    else
      frontend_networks="      - internal
      - traefik_network"
    fi
  else
    frontend_networks="      - internal"
    backend_ports="
    ports:
      - target: 3001
        published: 3001
        protocol: tcp
        mode: host"
    frontend_ports="
    ports:
      - target: 80
        published: 5173
        protocol: tcp
        mode: host"
  fi

  cat >"$file" <<EOF
# Automatisch generiert vom FestSchmiede Installer v${INSTALLER_VERSION}
# $(date -Iseconds)
# Stack: ${stack_name} | Node: ${CFG[SWARM_NODE_HOSTNAME]:-?} (${CFG[SWARM_NODE_ID]:-?})
# Swarm liest keine .env – sensible Werte sind inline (chmod 600 auf stack.yml)

version: "3.8"

services:${postgres_service}
  backend:
    image: ${image_prefix}/backend:${image_tag}
${backend_ports}
    environment:
      NODE_ENV: production
      PORT: "3001"
      DATABASE_URL: "${database_url}"
      JWT_SECRET: "${jwt_sec}"
      JWT_EXPIRES_IN: "${CFG[JWT_EXPIRES_IN]:-8h}"
      APP_ENCRYPTION_KEY: "${enc_key}"
      CORS_ORIGIN: "${cors}"
      MULTI_TENANT_ENABLED: "${CFG[MULTI_TENANT_ENABLED]:-false}"
      PLATFORM_DOMAIN: "${domain}"
      PLATFORM_BASE_DOMAIN: "${domain}"
      PLATFORM_WWW_DOMAIN: "${www_domain}"
      PLATFORM_APP_DOMAIN: "${app_domain}"
      PLATFORM_ALLOWED_ORIGINS: "${allowed}"
      DEFAULT_TENANT_SLUG: "${CFG[DEFAULT_TENANT_SLUG]:-default}"
      TRUSTED_PROXY_HOPS: "${CFG[TRUSTED_PROXY_HOPS]:-2}"
      LOG_FORMAT: "${CFG[LOG_FORMAT]:-json}"
      PLATFORM_ADMIN_EMAIL: "${admin_email}"
      PLATFORM_ADMIN_PASSWORD: "${admin_pass}"
${redis_env}
${smtp_env}
    volumes:
      - uploads_data:/app/uploads
    networks:
      - internal
    deploy:
      replicas: 1
$(_swarm_node_placement_yaml)
      restart_policy:
        condition: on-failure
        delay: 10s
      resources:
        limits:
          cpus: "2"
          memory: 512M
        reservations:
          memory: 128M
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://127.0.0.1:3001/api/health"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 40s

  frontend:
    image: ${image_prefix}/frontend:${image_tag}
${frontend_ports}
    environment:
      BACKEND_HOST: "${CFG[BACKEND_HOST]:-backend}"
      BACKEND_PORT: "${CFG[BACKEND_PORT]:-3001}"
    networks:
${frontend_networks}
    deploy:
      replicas: 1
$(_swarm_node_placement_yaml)
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "1"
          memory: 256M
        reservations:
          memory: 64M
${frontend_labels}
${redis_service}

networks:
  internal:
    driver: overlay
    name: ${internal_net}
    attachable: true
EOF

  if [[ "$use_proxy" == "yes" ]]; then
    cat >>"$file" <<EOF
  traefik_network:
    external: true
    name: ${proxy_net}
EOF
  fi

  cat >>"$file" <<EOF

volumes:
  postgres_data:
  uploads_data:${secrets_block}
EOF

  cp "$file" "$published"
  chmod 600 "$published"
  log_info "Swarm-Stack erzeugt: $published"
}

ensure_swarm_secrets() {
  deployment_uses_swarm || return 0
  local prefix="${CFG[STACK_NAME]:-festschmiede}"
  local name value

  for name in db_password jwt_secret app_encryption_key platform_admin_password; do
    case "$name" in
      db_password) value="${CFG[POSTGRES_PASSWORD]}" ;;
      jwt_secret) value="${CFG[JWT_SECRET]}" ;;
      app_encryption_key) value="${CFG[APP_ENCRYPTION_KEY]}" ;;
      platform_admin_password) value="${CFG[PLATFORM_ADMIN_PASSWORD]}" ;;
    esac
    [[ -n "$value" ]] || continue
    local full_name="${prefix}_${name}"
    if docker secret inspect "$full_name" >/dev/null 2>&1; then
      log_info "Swarm-Secret ${full_name} existiert bereits"
      continue
    fi
    if printf '%s' "$value" | docker secret create "$full_name" - >>"$LOG_FILE" 2>&1; then
      log_info "Swarm-Secret erstellt: ${full_name}"
    else
      log_warn "Swarm-Secret ${full_name} konnte nicht erstellt werden"
    fi
  done
}

generate_deployment_config() {
  if deployment_uses_swarm; then
    generate_swarm_stack
    generate_proxy_config_files
  else
    generate_compose_override
  fi
}

_write_traefik_frontend_labels() {
  local proxy_net="${CFG[DOCKER_PROXY_NETWORK]}"
  local rule="${CFG[TRAEFIK_ROUTER_RULE]:-$(build_traefik_host_rule compose)}"

  cat <<EOF
    labels:
      - traefik.enable=true
      - traefik.docker.network=${proxy_net}
      - traefik.http.routers.festschmiede.rule=${rule}
      - traefik.http.routers.festschmiede.entrypoints=websecure
EOF
  _write_traefik_tls_labels "      "
  cat <<EOF
      - traefik.http.services.festschmiede.loadbalancer.server.port=80
      - traefik.http.middlewares.festschmiede-headers.headers.sslredirect=true
      - traefik.http.middlewares.festschmiede-headers.headers.stsSeconds=31536000
      - traefik.http.routers.festschmiede.middlewares=festschmiede-headers
EOF
}

generate_proxy_config_files() {
  apply_defaults
  proxy_generates_config_files || return 0

  local out="${INSTALL_DIR}/installer/generated/proxy"
  local domain="${CFG[PLATFORM_DOMAIN]}"
  local proxy_net="${CFG[DOCKER_PROXY_NETWORK]}"
  local mode="${CFG[PROXY_MODE]}"
  local nginx_names
  nginx_names="$(build_nginx_server_names)"
  mkdir -p "$out"

  cat >"${out}/README.md" <<EOF
# Reverse-Proxy-Konfiguration (automatisch generiert)

- Proxy-Typ: **${mode}**
- Domain: **${domain}**
- Docker-Netzwerk (Frontend): **${proxy_net}**
- Frontend-Container: **festschmiede-frontend:80**

Die Dateien in diesem Ordner sind Vorlagen. Prüfen Sie Pfade, Zertifikate
und Netzwerk-Anbindung an Ihre Umgebung, bevor Sie sie aktivieren.

TLS: Pro Hostname ein eigenes Zertifikat (kein Wildcard). Mandanten-Subdomains
erhalten jeweils ein separates Zertifikat über Traefik/Let's Encrypt.
EOF

  case "$mode" in
    nginx)
      if [[ "${CFG[PROXY_DEPLOYMENT]:-}" == "manual" ]]; then
        cat >"${out}/nginx-site.conf" <<EOF
# FestSchmiede – nginx auf dem Host (Vorlage)
# Frontend über veröffentlichten Port (Standard: localhost:5173)

upstream festschmiede_frontend {
    server 127.0.0.1:5173;
    keepalive 32;
}

server {
    listen 80;
    server_name ${nginx_names};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${nginx_names};

    # ssl_certificate     /pfad/zu/fullchain.pem;
    # ssl_certificate_key /pfad/zu/privkey.pem;

    location / {
        proxy_pass http://festschmiede_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /socket.io/ {
        proxy_pass http://festschmiede_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;
    }
}
EOF
      else
        cat >"${out}/nginx-site.conf" <<EOF
# FestSchmiede – nginx (Vorlage)
# Frontend im Docker-Netzwerk ${proxy_net}: festschmiede-frontend:80

upstream festschmiede_frontend {
    server festschmiede-frontend:80;
    keepalive 32;
}

server {
    listen 80;
    server_name ${nginx_names};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${nginx_names};

    # ssl_certificate     /pfad/zu/fullchain.pem;
    # ssl_certificate_key /pfad/zu/privkey.pem;

    location / {
        proxy_pass http://festschmiede_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /socket.io/ {
        proxy_pass http://festschmiede_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
}
EOF
      fi
      ;;
    caddy)
      cat >"${out}/Caddyfile" <<EOF
# FestSchmiede – Caddy (Vorlage)
# nginx/Caddy muss im Docker-Netzwerk ${proxy_net} erreichbar sein.

${nginx_names} {
    reverse_proxy festschmiede-frontend:80 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
EOF
      ;;
    apache)
      cat >"${out}/apache-vhost.conf" <<EOF
# FestSchmiede – Apache (Vorlage)
# VirtualHost für ${domain}

<VirtualHost *:443>
    ServerName ${domain}
    ServerAlias ${nginx_names}

    # SSLEngine on
    # SSLCertificateFile /pfad/zu/cert.pem
    # SSLCertificateKeyFile /pfad/zu/key.pem

    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    ProxyPass / http://festschmiede-frontend:80/
    ProxyPassReverse / http://festschmiede-frontend:80/
</VirtualHost>
EOF
      ;;
    haproxy)
      cat >"${out}/haproxy.cfg.snippet" <<EOF
# FestSchmiede – HAProxy (Vorlage)
# Backend muss festschmiede-frontend:80 im Netz ${proxy_net} erreichen.

frontend festschmiede_https
    bind *:443 ssl crt /pfad/zu/combined.pem
    use_backend festschmiede_frontend

backend festschmiede_frontend
    server frontend1 festschmiede-frontend:80 check
EOF
      ;;
  esac

  log_info "Proxy-Konfigurationsvorlagen erzeugt: ${out}/"
}

generate_compose_override() {
  apply_defaults
  local out="${INSTALL_DIR}/installer/generated"
  mkdir -p "$out"

  local internal_net="${CFG[DOCKER_INTERNAL_NETWORK]}"
  local proxy_net="${CFG[DOCKER_PROXY_NETWORK]}"
  local proxy_create="${CFG[DOCKER_NETWORK_CREATE]:-yes}"
  local use_proxy="${CFG[USES_REVERSE_PROXY]}"
  local proxy_mode="${CFG[PROXY_MODE]:-none}"
  local use_redis="${CFG[USE_REDIS]:-no}"
  local file="${out}/compose.override.yml"
  local redis_env="" smtp_env="" redis_service="" volumes_block=""

  if [[ "$use_redis" == "internal" ]]; then
    redis_env="      REDIS_URL: redis://:\${REDIS_PASSWORD:-}@redis:6379"
  fi
  if [[ "${CFG[SMTP_ENABLED]:-no}" == "yes" ]]; then
    smtp_env="      INSTALL_SMTP_HOST: ${CFG[SMTP_HOST]:-}
      INSTALL_SMTP_PORT: ${CFG[SMTP_PORT]:-587}"
  fi
  if [[ "$use_redis" == "internal" && ! ( "$proxy_mode" == "traefik" && "${CFG[PROXY_DEPLOYMENT]:-}" == "bundled" ) ]]; then
    redis_service="
  redis:
    image: redis:7-alpine
    container_name: festschmiede-redis
    restart: unless-stopped
    profiles:
      - redis
    command: [\"redis-server\", \"--appendonly\", \"yes\"]
    volumes:
      - redis_data:/data
    networks:
      - internal
    healthcheck:
      test: [\"CMD\", \"redis-cli\", \"ping\"]
      interval: 10s
      timeout: 3s
      retries: 5"
    volumes_block="
volumes:
  redis_data:"
  fi

  cat >"$file" <<EOF
# Automatisch generiert vom FestSchmiede Installer v${INSTALLER_VERSION}
# $(date -Iseconds)
# Internes Netz: ${internal_net} (Backend, DB, Redis, Frontend)
# Proxy-Netz:    ${proxy_net} (nur Frontend, wenn Reverse Proxy aktiv)

networks:
  internal:
    name: ${internal_net}
    driver: bridge
EOF

  if [[ "$use_proxy" == "yes" ]] && proxy_uses_traefik_network; then
    if [[ "$proxy_create" == "no" ]]; then
      cat >>"$file" <<EOF
  public:
    name: ${proxy_net}
    external: true
EOF
    else
      cat >>"$file" <<EOF
  public:
    name: ${proxy_net}
    driver: bridge
EOF
    fi
  fi

  if [[ "$use_proxy" == "yes" ]] && ! proxy_uses_traefik_network; then
    if [[ "$proxy_create" == "yes" ]]; then
      cat >>"$file" <<EOF
  proxy:
    name: ${proxy_net}
    driver: bridge
EOF
    else
      cat >>"$file" <<EOF
  proxy:
    name: ${proxy_net}
    external: true
EOF
    fi
  fi

  if [[ "$use_proxy" == "yes" ]]; then
    if proxy_uses_traefik_network; then
      cat >>"$file" <<EOF

services:
  postgres:
    networks:
      - internal
  backend:
    networks:
      - internal
    ports: !reset []
    expose:
      - "3001"
    environment:
      PLATFORM_ADMIN_EMAIL: ${CFG[PLATFORM_ADMIN_EMAIL]:-platform@festschmiede.local}
      PLATFORM_ADMIN_PASSWORD: \${PLATFORM_ADMIN_PASSWORD}
${redis_env}
${smtp_env}
  frontend:
    networks:
      - internal
      - public
    ports: !reset []
    expose:
      - "80"
    environment:
      BACKEND_HOST: \${BACKEND_HOST:-backend}
      BACKEND_PORT: \${BACKEND_PORT:-3001}
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://127.0.0.1:80 || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 5
EOF
      if proxy_generates_traefik_labels; then
        _write_traefik_frontend_labels >>"$file"
      fi
      if [[ -n "$redis_service" ]]; then
        cat >>"$file" <<EOF
${redis_service}
${volumes_block}
EOF
      fi
    elif [[ "${CFG[PROXY_DEPLOYMENT]:-}" == "manual" ]]; then
      cat >>"$file" <<EOF

services:
  postgres:
    networks:
      - internal
  backend:
    networks:
      - internal
    ports: !reset []
    expose:
      - "3001"
    environment:
      PLATFORM_ADMIN_EMAIL: ${CFG[PLATFORM_ADMIN_EMAIL]:-platform@festschmiede.local}
      PLATFORM_ADMIN_PASSWORD: \${PLATFORM_ADMIN_PASSWORD}
${redis_env}
${smtp_env}
  frontend:
    networks:
      - internal
${redis_service}
${volumes_block}
EOF
    else
      cat >>"$file" <<EOF

services:
  postgres:
    networks:
      - internal
  backend:
    networks:
      - internal
    ports: !reset []
    expose:
      - "3001"
    environment:
      PLATFORM_ADMIN_EMAIL: ${CFG[PLATFORM_ADMIN_EMAIL]:-platform@festschmiede.local}
      PLATFORM_ADMIN_PASSWORD: \${PLATFORM_ADMIN_PASSWORD}
${redis_env}
${smtp_env}
  frontend:
    networks:
      - internal
      - proxy
    ports: !reset []
    expose:
      - "80"
    environment:
      BACKEND_HOST: \${BACKEND_HOST:-backend}
      BACKEND_PORT: \${BACKEND_PORT:-3001}
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://127.0.0.1:80 || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 5
${redis_service}
${volumes_block}
EOF
    fi
  else
    cat >>"$file" <<EOF

services:
  postgres:
    networks:
      - internal
  backend:
    networks:
      - internal
    environment:
      PLATFORM_ADMIN_EMAIL: ${CFG[PLATFORM_ADMIN_EMAIL]:-platform@festschmiede.local}
      PLATFORM_ADMIN_PASSWORD: \${PLATFORM_ADMIN_PASSWORD}
${redis_env}
${smtp_env}
  frontend:
    networks:
      - internal
${redis_service}
${volumes_block}
EOF
  fi

  publish_compose_override "$file"
  log_info "Compose-Override erzeugt: $file"
  generate_proxy_config_files
}

generate_env_file() {
  apply_defaults
  local env_file="${INSTALL_DIR}/.env"
  local backup="${BACKUP_DIR}/.env.$(date +%Y%m%d-%H%M%S)"

  if [[ -f "$env_file" ]]; then
    cp "$env_file" "$backup"
    log_info "Backup der .env: $backup"
  fi

  local compose_file_line=""
  if ! deployment_uses_swarm && [[ -f "$(compose_override_publish_path)" ]]; then
    if [[ "${CFG[PROXY_MODE]:-}" == "traefik" && "${CFG[PROXY_DEPLOYMENT]:-}" == "bundled" ]]; then
      compose_file_line="COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml:docker-compose.override.yml"
    else
      compose_file_line="COMPOSE_FILE=docker-compose.yml:docker-compose.override.yml"
    fi
  fi

  cat >"$env_file" <<EOF
# FestSchmiede – automatisch generiert vom Installer v${INSTALLER_VERSION}
# $(date -Iseconds)
# Modus: ${INSTALL_MODE} | Profil: ${CFG[INSTALL_PROFILE]:-local}

POSTGRES_USER=${CFG[POSTGRES_USER]}
POSTGRES_PASSWORD=${CFG[POSTGRES_PASSWORD]}
POSTGRES_DB=${CFG[POSTGRES_DB]}

GHCR_IMAGE_PREFIX=${CFG[GHCR_IMAGE_PREFIX]}
IMAGE_TAG=${CFG[IMAGE_TAG]}

JWT_SECRET=${CFG[JWT_SECRET]}
JWT_EXPIRES_IN=${CFG[JWT_EXPIRES_IN]}
APP_ENCRYPTION_KEY=${CFG[APP_ENCRYPTION_KEY]}

CORS_ORIGIN=${CFG[CORS_ORIGIN]}
VITE_API_URL=${CFG[VITE_API_URL]}
VITE_WS_URL=${CFG[VITE_WS_URL]}

MULTI_TENANT_ENABLED=${CFG[MULTI_TENANT_ENABLED]}
PLATFORM_DOMAIN=${CFG[PLATFORM_DOMAIN]}
ENABLE_WWW_HOST=${CFG[ENABLE_WWW_HOST]:-yes}
ENABLE_APP_HOST=${CFG[ENABLE_APP_HOST]:-yes}
WWW_SUBDOMAIN=${CFG[WWW_SUBDOMAIN]:-www}
APP_SUBDOMAIN=${CFG[APP_SUBDOMAIN]:-app}
API_SUBDOMAIN=${CFG[API_SUBDOMAIN]:-api}
PLATFORM_WWW_DOMAIN=${CFG[PLATFORM_WWW_DOMAIN]:-}
PLATFORM_APP_DOMAIN=${CFG[PLATFORM_APP_DOMAIN]:-}
PLATFORM_API_DOMAIN=
PLATFORM_ALLOWED_ORIGINS=${CFG[PLATFORM_ALLOWED_ORIGINS]:-}
TRAEFIK_ROUTER_RULE=$(dotenv_format_value "${CFG[TRAEFIK_ROUTER_RULE]:-}")
DEFAULT_TENANT_SLUG=${CFG[DEFAULT_TENANT_SLUG]}
TRUSTED_PROXY_HOPS=${CFG[TRUSTED_PROXY_HOPS]}
LOG_FORMAT=${CFG[LOG_FORMAT]}

PLATFORM_ADMIN_EMAIL=${CFG[PLATFORM_ADMIN_EMAIL]:-platform@festschmiede.local}
PLATFORM_ADMIN_PASSWORD=${CFG[PLATFORM_ADMIN_PASSWORD]}

ACME_EMAIL=${CFG[ACME_EMAIL]:-}
REDIS_URL=${CFG[REDIS_URL]:-}

FESTSCHMIEDE_INTERNAL_NETWORK=${CFG[DOCKER_INTERNAL_NETWORK]}
BACKEND_HOST=${CFG[BACKEND_HOST]:-backend}
BACKEND_PORT=${CFG[BACKEND_PORT]:-3001}
FESTSCHMIEDE_PROXY_NETWORK=${CFG[DOCKER_PROXY_NETWORK]}
DOCKER_PROXY_NETWORK=${CFG[DOCKER_PROXY_NETWORK]}
DOCKER_NETWORK_CREATE=${CFG[DOCKER_NETWORK_CREATE]:-yes}
PROXY_MODE=${CFG[PROXY_MODE]:-none}
PROXY_DEPLOYMENT=${CFG[PROXY_DEPLOYMENT]:-none}
TRAEFIK_CERT_RESOLVER=${CFG[TRAEFIK_CERT_RESOLVER]:-}

DEPLOYMENT_MODE=${CFG[DEPLOYMENT_MODE]:-compose}
STACK_NAME=${CFG[STACK_NAME]:-festschmiede}
SWARM_NODE_ID=${CFG[SWARM_NODE_ID]:-}
SWARM_NODE_HOSTNAME=${CFG[SWARM_NODE_HOSTNAME]:-}

${compose_file_line}

# Installer-Metadaten
INSTALLER_VERSION=${INSTALLER_VERSION}
INSTALL_PROFILE=${CFG[INSTALL_PROFILE]:-local}
EOF

  chmod 600 "$env_file"
  log_info ".env erzeugt: $env_file"
}

format_config_summary() {
  apply_defaults
  local s=""
  s+="Modus:            ${INSTALL_MODE}"
  s+=$'\n'"Profil:            ${CFG[INSTALL_PROFILE]:-local}"
  s+=$'\n'"Ausrollung:        ${CFG[DEPLOYMENT_MODE]:-compose}"
  if deployment_uses_swarm; then
    s+=$'\n'"Stack:             ${CFG[STACK_NAME]:-festschmiede} (1 Replica auf ${CFG[SWARM_NODE_HOSTNAME]:-diesem Host})"
  fi
  s+=$'\n'"Plattform:         ${CFG[PLATFORM_NAME]:-FestSchmiede}"
  s+=$'\n'"Domain:            ${CFG[PLATFORM_DOMAIN]}"
  if [[ "${CFG[INSTALL_PROFILE]:-}" == "production" ]]; then
    local host_list=""
    [[ "${CFG[ENABLE_WWW_HOST]:-yes}" == "yes" ]] && host_list="www.${CFG[PLATFORM_DOMAIN]}"
    if [[ "${CFG[ENABLE_APP_HOST]:-yes}" == "yes" ]]; then
      [[ -n "$host_list" ]] && host_list+=", "
      host_list+="app.${CFG[PLATFORM_DOMAIN]}"
    fi
    s+=$'\n'"Hosts:             ${host_list}"
    s+=$'\n'"Mandanten:         app.${CFG[PLATFORM_DOMAIN]}/<tenant>"
    s+=$'\n'"TLS:               Per-Host (Traefik/${CFG[TRAEFIK_CERT_RESOLVER]:-le}, kein Wildcard-Zertifikat)"
  fi
  s+=$'\n'"Datenbank:         ${CFG[DB_MODE]:-internal} (PostgreSQL)"
  s+=$'\n'"Redis:             ${CFG[USE_REDIS]:-no}"
  s+=$'\n'"Reverse Proxy:     ${CFG[PROXY_MODE]:-none} (${CFG[PROXY_DEPLOYMENT]:-none})"
  s+=$'\n'"Internes Netz:     ${CFG[DOCKER_INTERNAL_NETWORK]:-festschmiede_internal} (immer)"
  if [[ "${CFG[USES_REVERSE_PROXY]:-no}" == "yes" ]]; then
    s+=$'\n'"Proxy-Netz:        ${CFG[DOCKER_PROXY_NETWORK]:-festschmiede_public} (nur Frontend)"
    if proxy_generates_traefik_labels; then
      if deployment_uses_swarm; then
        s+=$'\n'"Traefik-Labels:    stack.yml (deploy.labels)"
      else
        s+=$'\n'"Traefik-Labels:    docker-compose.override.yml (Frontend)"
      fi
    elif proxy_generates_config_files; then
      s+=$'\n'"Proxy-Vorlagen:    installer/generated/proxy/"
    fi
  fi
  s+=$'\n'"SMTP:              ${CFG[SMTP_ENABLED]:-no}"
  s+=$'\n\n'"$(format_secrets_summary)"
  printf '%s' "$s"
}

get_access_urls() {
  apply_defaults
  if [[ "${CFG[INSTALL_PROFILE]}" == "production" ]]; then
    echo "Homepage:  https://${CFG[WWW_SUBDOMAIN]:-www}.${CFG[PLATFORM_DOMAIN]}"
    echo "APP:       https://${CFG[APP_SUBDOMAIN]:-app}.${CFG[PLATFORM_DOMAIN]}/platform"
    echo "Mandant:   https://${CFG[APP_SUBDOMAIN]:-app}.${CFG[PLATFORM_DOMAIN]}/<tenant>/public"
    if [[ "${CFG[ENABLE_APP_HOST]:-yes}" == "yes" ]]; then
      echo "Health:    https://${CFG[APP_SUBDOMAIN]:-app}.${CFG[PLATFORM_DOMAIN]}/api/health"
    elif [[ "${CFG[ENABLE_WWW_HOST]:-yes}" == "yes" ]]; then
      echo "Health:    https://${CFG[WWW_SUBDOMAIN]:-www}.${CFG[PLATFORM_DOMAIN]}/api/health"
    fi
    echo "Hinweis:   Backend nur intern (Traefik → Frontend → backend:3001)"
  else
    echo "Frontend:  http://localhost:5173"
    echo "Backend:   http://localhost:3001"
    echo "Plattform: http://localhost:5173/platform"
  fi
}
