#!/usr/bin/env bash
# FestSchmiede Installer – System- und Infrastruktur-Erkennung

detect_os() {
  if [[ -f /etc/os-release ]]; then
    # shellcheck source=/dev/null
    source /etc/os-release
    SYS_DETECT[os_id]="${ID:-unknown}"
    SYS_DETECT[os_name]="${PRETTY_NAME:-$ID}"
    SYS_DETECT[os_version]="${VERSION_ID:-}"
  else
    SYS_DETECT[os_id]="unknown"
    SYS_DETECT[os_name]="$(uname -s)"
    SYS_DETECT[os_version]=""
  fi
  SYS_DETECT[arch]="$(uname -m)"
  SYS_DETECT[kernel]="$(uname -r)"
}

detect_hardware() {
  SYS_DETECT[cpu_cores]="$(nproc 2>/dev/null || echo 1)"
  if [[ -f /proc/meminfo ]]; then
    local mem_kb
    mem_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    SYS_DETECT[ram_mb]=$((mem_kb / 1024))
  else
    SYS_DETECT[ram_mb]="?"
  fi
}

detect_docker() {
  SYS_DETECT[docker_installed]="no"
  SYS_DETECT[docker_version]=""
  SYS_DETECT[compose_installed]="no"
  SYS_DETECT[compose_version]=""

  if command -v docker >/dev/null 2>&1; then
    SYS_DETECT[docker_installed]="yes"
    SYS_DETECT[docker_version]="$(docker --version 2>/dev/null | head -1)"
    if docker compose version >/dev/null 2>&1; then
      SYS_DETECT[compose_installed]="yes"
      SYS_DETECT[compose_version]="$(docker compose version 2>/dev/null | head -1)"
    elif command -v docker-compose >/dev/null 2>&1; then
      SYS_DETECT[compose_installed]="yes"
      SYS_DETECT[compose_version]="$(docker-compose --version 2>/dev/null | head -1)"
      COMPOSE_CMD=(docker-compose)
    fi
  fi
}

detect_docker_resources() {
  DOCKER_NETWORKS=()
  DOCKER_VOLUMES=()
  DOCKER_CONTAINERS=()

  [[ "${SYS_DETECT[docker_installed]}" == "yes" ]] || return 0

  while IFS= read -r line; do
    [[ -n "$line" ]] && DOCKER_NETWORKS+=("$line")
  done < <(docker network ls --format '{{.Name}}|{{.Driver}}' 2>/dev/null || true)

  while IFS= read -r line; do
    [[ -n "$line" ]] && DOCKER_VOLUMES+=("$line")
  done < <(docker volume ls --format '{{.Name}}' 2>/dev/null || true)

  while IFS= read -r line; do
    [[ -n "$line" ]] && DOCKER_CONTAINERS+=("$line")
  done < <(docker ps -a --format '{{.Names}}|{{.Status}}|{{.Image}}' 2>/dev/null || true)
}

detect_reverse_proxy() {
  SYS_DETECT[proxy_traefik]="no"
  SYS_DETECT[proxy_nginx]="no"
  SYS_DETECT[proxy_caddy]="no"
  SYS_DETECT[proxy_apache]="no"
  SYS_DETECT[proxy_haproxy]="no"

  # Docker-Container
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -qi traefik; then
    SYS_DETECT[proxy_traefik]="yes"
  fi
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -qi nginx; then
    SYS_DETECT[proxy_nginx]="yes"
  fi
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -qi caddy; then
    SYS_DETECT[proxy_caddy]="yes"
  fi

  # Systemdienste
  if systemctl is-active nginx >/dev/null 2>&1; then SYS_DETECT[proxy_nginx]="yes"; fi
  if systemctl is-active apache2 >/dev/null 2>&1 || systemctl is-active httpd >/dev/null 2>&1; then
    SYS_DETECT[proxy_apache]="yes"
  fi
  if systemctl is-active haproxy >/dev/null 2>&1; then SYS_DETECT[proxy_haproxy]="yes"; fi

  SYS_DETECT[proxy_detected]="none"
  for p in traefik nginx caddy apache haproxy; do
    if [[ "${SYS_DETECT[proxy_${p}]}" == "yes" ]]; then
      SYS_DETECT[proxy_detected]="$p"
      break
    fi
  done
}

detect_firewall() {
  SYS_DETECT[firewall]="none"
  if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
    SYS_DETECT[firewall]="ufw"
  elif command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state 2>/dev/null | grep -q running; then
    SYS_DETECT[firewall]="firewalld"
  elif command -v iptables >/dev/null 2>&1; then
    SYS_DETECT[firewall]="iptables"
  fi
}

detect_ports() {
  SYS_DETECT[port_80]="free"
  SYS_DETECT[port_443]="free"
  SYS_DETECT[port_3001]="free"
  SYS_DETECT[port_5173]="free"

  for port in 80 443 3001 5173; do
    if ss -tln 2>/dev/null | grep -q ":${port} " || netstat -tln 2>/dev/null | grep -q ":${port} "; then
      SYS_DETECT["port_${port}"]="belegt"
    fi
  done
}

compose_project_name() {
  local name=""
  if [[ -f "${INSTALL_DIR}/.env" ]]; then
    name=$(grep -E '^COMPOSE_PROJECT_NAME=' "${INSTALL_DIR}/.env" 2>/dev/null | head -1 | cut -d= -f2-)
    name="${name%$'\r'}"
    name="${name#\"}"; name="${name%\"}"
    name="${name#\'}"; name="${name%\'}"
  fi
  if [[ -z "$name" ]]; then
    name=$(basename "$INSTALL_DIR")
  fi
  echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_-]//g'
}

is_festschmiede_postgres_volume() {
  local vol="$1" project candidate
  [[ -n "$vol" ]] || return 1
  project=$(compose_project_name)
  for candidate in "${project}_postgres_data" "festschmiede_postgres_data" "vereins_postgres_data"; do
    [[ -n "$candidate" && "$vol" == "$candidate" ]] && return 0
  done
  return 1
}

postgres_volume_from_container() {
  local container vol
  for container in festschmiede-postgres vereins-postgres; do
    if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$container"; then
      vol=$(docker inspect "$container" --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' 2>/dev/null || true)
      if [[ -n "$vol" ]]; then
        echo "$vol"
        return 0
      fi
    fi
  done
  return 1
}

detect_postgres_volume() {
  SYS_DETECT[postgres_volume]="no"
  SYS_DETECT[postgres_volume_name]=""
  local vol container_vol

  if container_vol=$(postgres_volume_from_container); then
    SYS_DETECT[postgres_volume]="yes"
    SYS_DETECT[postgres_volume_name]="$container_vol"
    return 0
  fi

  for vol in "${DOCKER_VOLUMES[@]}"; do
    is_festschmiede_postgres_volume "$vol" || continue
    SYS_DETECT[postgres_volume]="yes"
    SYS_DETECT[postgres_volume_name]="$vol"
    return 0
  done
}

detect_existing_festschmiede() {
  SYS_DETECT[existing_install]="no"
  if [[ -f "${INSTALL_DIR}/.env" ]]; then
    SYS_DETECT[existing_install]="yes"
    SYS_DETECT[existing_env]="yes"
  fi
  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qE 'vereins-|festschmiede'; then
    SYS_DETECT[existing_containers]="yes"
    SYS_DETECT[existing_install]="yes"
  fi
}

run_full_detection() {
  log_info "Starte Systemanalyse..."
  detect_os
  detect_hardware
  detect_docker
  detect_docker_resources
  detect_reverse_proxy
  detect_firewall
  detect_ports
  detect_postgres_volume
  detect_existing_festschmiede
  log_info "Systemanalyse abgeschlossen"
}

format_detection_report() {
  local report=""
  report+="--- System ---"
  report+=$'\n'"Distribution:   ${SYS_DETECT[os_name]:-?} (${SYS_DETECT[arch]})"
  report+=$'\n'"Kernel:         ${SYS_DETECT[kernel]:-?}"
  report+=$'\n'"CPU-Kerne:      ${SYS_DETECT[cpu_cores]:-?}"
  report+=$'\n'"RAM:            ${SYS_DETECT[ram_mb]:-?} MB"
  report+=$'\n\n'"--- Docker ---"
  report+=$'\n'"Installiert:    ${SYS_DETECT[docker_installed]}"
  report+=$'\n'"Version:        ${SYS_DETECT[docker_version]:-–}"
  report+=$'\n'"Compose:        ${SYS_DETECT[compose_installed]} – ${SYS_DETECT[compose_version]:-–}"
  report+=$'\n\n'"--- Netzwerk / Proxy ---"
  report+=$'\n'"Reverse Proxy:  ${SYS_DETECT[proxy_detected]}"
  report+=$'\n'"Firewall:       ${SYS_DETECT[firewall]}"
  report+=$'\n'"Port 80:        ${SYS_DETECT[port_80]}"
  report+=$'\n'"Port 443:       ${SYS_DETECT[port_443]}"
  report+=$'\n'"Port 3001:      ${SYS_DETECT[port_3001]}"
  report+=$'\n'"Port 5173:      ${SYS_DETECT[port_5173]}"

  if [[ ${#DOCKER_NETWORKS[@]} -gt 0 ]]; then
    report+=$'\n\n'"--- Docker-Netzwerke (${#DOCKER_NETWORKS[@]}) ---"
    local n
    for n in "${DOCKER_NETWORKS[@]:0:8}"; do
      report+=$'\n'"  - ${n//|/ (})"
    done
    [[ ${#DOCKER_NETWORKS[@]} -gt 8 ]] && report+=$'\n'"  ... und $(( ${#DOCKER_NETWORKS[@]} - 8 )) weitere"
  fi

  if [[ ${#DOCKER_VOLUMES[@]} -gt 0 ]]; then
    report+=$'\n\n'"--- Docker-Volumes (${#DOCKER_VOLUMES[@]}) ---"
    local v
    for v in "${DOCKER_VOLUMES[@]:0:6}"; do
      report+=$'\n'"  - $v"
    done
    if [[ "${SYS_DETECT[postgres_volume]:-no}" == "yes" ]]; then
      report+=$'\n'"  → PostgreSQL-Daten: ${SYS_DETECT[postgres_volume_name]}"
    fi
  fi

  report+=$'\n\n'"--- Bestehende Installation ---"
  report+=$'\n'"Erkannt:        ${SYS_DETECT[existing_install]}"
  printf '%s' "$report"
}

network_description() {
  local name="$1"
  case "$name" in
    bridge) echo "Standard Docker-Brücke" ;;
    host) echo "Host-Netzwerk (keine Isolation)" ;;
    none) echo "Kein Netzwerk" ;;
    traefik*|*traefik*) echo "Traefik Reverse Proxy" ;;
    *proxy*) echo "Proxy-Netzwerk" ;;
    festschmiede*) echo "FestSchmiede-Netzwerk" ;;
    *) echo "Benutzerdefiniertes Netzwerk" ;;
  esac
}
