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
  CFG[DOCKER_INTERNAL_NETWORK]="${CFG[DOCKER_INTERNAL_NETWORK]:-festschmiede_internal}"
  CFG[DOCKER_PROXY_NETWORK]="${CFG[DOCKER_PROXY_NETWORK]:-${CFG[DOCKER_NETWORK]:-festschmiede_public}}"
  CFG[USES_REVERSE_PROXY]="${CFG[USES_REVERSE_PROXY]:-no}"

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

  if [[ "${CFG[INSTALL_PROFILE]:-}" == "production" ]]; then
    CFG[MULTI_TENANT_ENABLED]="true"
    CFG[PLATFORM_DOMAIN]="${CFG[PLATFORM_DOMAIN]:-festschmiede.local}"
    CFG[PLATFORM_WILDCARD_DOMAIN]="*.${CFG[PLATFORM_DOMAIN]}"
    CFG[WWW_SUBDOMAIN]="${CFG[WWW_SUBDOMAIN]:-www}"
    CFG[APP_SUBDOMAIN]="${CFG[APP_SUBDOMAIN]:-app}"
    CFG[API_SUBDOMAIN]="${CFG[API_SUBDOMAIN]:-api}"
    CFG[ACME_EMAIL]="${CFG[ACME_EMAIL]:-admin@${CFG[PLATFORM_DOMAIN]}}"
    CFG[CORS_ORIGIN]="https://${CFG[APP_SUBDOMAIN]:-app}.${CFG[PLATFORM_DOMAIN]}"
    CFG[VITE_API_URL]="https://${CFG[API_SUBDOMAIN]:-api}.${CFG[PLATFORM_DOMAIN]}"
    CFG[VITE_WS_URL]="https://${CFG[API_SUBDOMAIN]:-api}.${CFG[PLATFORM_DOMAIN]}"
    CFG[PLATFORM_ALLOWED_ORIGINS]="https://${CFG[PLATFORM_DOMAIN]},https://*.${CFG[PLATFORM_DOMAIN]}"
  else
    CFG[MULTI_TENANT_ENABLED]="false"
    CFG[PLATFORM_DOMAIN]="${CFG[PLATFORM_DOMAIN]:-localhost}"
    CFG[CORS_ORIGIN]="${CFG[CORS_ORIGIN]:-http://localhost:5173}"
    CFG[VITE_API_URL]="${CFG[VITE_API_URL]:-http://localhost:3001}"
    CFG[VITE_WS_URL]="${CFG[VITE_WS_URL]:-http://localhost:3001}"
  fi
}

build_compose_files() {
  COMPOSE_FILES=("-f" "${INSTALL_DIR}/docker-compose.yml")

  apply_defaults
  if [[ "${CFG[PROXY_MODE]:-none}" == "traefik" && "${CFG[PROXY_DEPLOYMENT]:-}" == "bundled" ]]; then
    COMPOSE_FILES+=("-f" "${INSTALL_DIR}/docker-compose.prod.yml")
  fi

  if [[ -f "${INSTALL_DIR}/installer/generated/compose.override.yml" ]]; then
    COMPOSE_FILES+=("-f" "${INSTALL_DIR}/installer/generated/compose.override.yml")
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

_write_traefik_frontend_labels() {
  local domain="${CFG[PLATFORM_DOMAIN]}"
  local proxy_net="${CFG[DOCKER_PROXY_NETWORK]}"
  local resolver="${CFG[TRAEFIK_CERT_RESOLVER]:-}"

  cat <<EOF
    labels:
      - traefik.enable=true
      - traefik.docker.network=${proxy_net}
      - traefik.http.routers.festschmiede.rule=Host(\`${domain}\`) || HostRegexp(\`^[a-z0-9-]+\\\\.${domain}$\`)
      - traefik.http.routers.festschmiede.entrypoints=websecure
EOF
  if [[ -n "$resolver" && "${CFG[HTTPS_ENABLED]:-no}" == "yes" ]]; then
    cat <<EOF
      - traefik.http.routers.festschmiede.tls.certresolver=${resolver}
      - traefik.http.routers.festschmiede.tls.domains[0].main=${domain}
      - traefik.http.routers.festschmiede.tls.domains[0].sans=*.${domain}
EOF
  else
    echo "      - traefik.http.routers.festschmiede.tls=true"
  fi
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
  mkdir -p "$out"

  cat >"${out}/README.md" <<EOF
# Reverse-Proxy-Konfiguration (automatisch generiert)

- Proxy-Typ: **${mode}**
- Domain: **${domain}**
- Docker-Netzwerk (Frontend): **${proxy_net}**
- Frontend-Container: **festschmiede-frontend:80**

Die Dateien in diesem Ordner sind Vorlagen. Prüfen Sie Pfade, Zertifikate
und Netzwerk-Anbindung an Ihre Umgebung, bevor Sie sie aktivieren.
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
    server_name ${domain} *.${domain};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${domain} *.${domain};

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
    server_name ${domain} *.${domain};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${domain} *.${domain};

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

${domain}, *.${domain} {
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
    ServerAlias *.${domain}

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

  if [[ "$use_proxy" == "yes" ]] && proxy_uses_traefik_network && [[ "$proxy_create" == "no" ]]; then
    cat >>"$file" <<EOF
  public:
    name: ${proxy_net}
    external: true
EOF
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
PLATFORM_WILDCARD_DOMAIN=${CFG[PLATFORM_WILDCARD_DOMAIN]:-}
WWW_SUBDOMAIN=${CFG[WWW_SUBDOMAIN]:-www}
APP_SUBDOMAIN=${CFG[APP_SUBDOMAIN]:-app}
API_SUBDOMAIN=${CFG[API_SUBDOMAIN]:-api}
PLATFORM_ALLOWED_ORIGINS=${CFG[PLATFORM_ALLOWED_ORIGINS]:-}
DEFAULT_TENANT_SLUG=${CFG[DEFAULT_TENANT_SLUG]}
TRUSTED_PROXY_HOPS=${CFG[TRUSTED_PROXY_HOPS]}
LOG_FORMAT=${CFG[LOG_FORMAT]}

PLATFORM_ADMIN_EMAIL=${CFG[PLATFORM_ADMIN_EMAIL]:-platform@festschmiede.local}
PLATFORM_ADMIN_PASSWORD=${CFG[PLATFORM_ADMIN_PASSWORD]}

ACME_EMAIL=${CFG[ACME_EMAIL]:-}
REDIS_URL=${CFG[REDIS_URL]:-}

FESTSCHMIEDE_INTERNAL_NETWORK=${CFG[DOCKER_INTERNAL_NETWORK]}
FESTSCHMIEDE_PROXY_NETWORK=${CFG[DOCKER_PROXY_NETWORK]}
PROXY_MODE=${CFG[PROXY_MODE]:-none}
PROXY_DEPLOYMENT=${CFG[PROXY_DEPLOYMENT]:-none}
TRAEFIK_CERT_RESOLVER=${CFG[TRAEFIK_CERT_RESOLVER]:-}

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
  s+=$'\n'"Plattform:         ${CFG[PLATFORM_NAME]:-FestSchmiede}"
  s+=$'\n'"Domain:            ${CFG[PLATFORM_DOMAIN]}"
  s+=$'\n'"Datenbank:         ${CFG[DB_MODE]:-internal} (PostgreSQL)"
  s+=$'\n'"Redis:             ${CFG[USE_REDIS]:-no}"
  s+=$'\n'"Reverse Proxy:     ${CFG[PROXY_MODE]:-none} (${CFG[PROXY_DEPLOYMENT]:-none})"
  s+=$'\n'"Internes Netz:     ${CFG[DOCKER_INTERNAL_NETWORK]:-festschmiede_internal} (immer)"
  if [[ "${CFG[USES_REVERSE_PROXY]:-no}" == "yes" ]]; then
    s+=$'\n'"Proxy-Netz:        ${CFG[DOCKER_PROXY_NETWORK]:-festschmiede_public} (nur Frontend)"
    if proxy_generates_traefik_labels; then
      s+=$'\n'"Traefik-Labels:    compose.override.yml (Frontend)"
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
    echo "Mandant:   https://<tenant>.${CFG[PLATFORM_DOMAIN]}"
  else
    echo "Frontend:  http://localhost:5173"
    echo "Backend:   http://localhost:3001"
    echo "Plattform: http://localhost:5173/platform"
  fi
}
