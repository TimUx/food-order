#!/usr/bin/env bash
# FestSchmiede Installer – Wizard-Schritte

# shellcheck source=installer/lib/common.sh
source "${INSTALLER_DIR}/lib/common.sh"
source "${INSTALLER_DIR}/lib/tui.sh"
source "${INSTALLER_DIR}/lib/detect.sh"
source "${INSTALLER_DIR}/lib/validate.sh"
source "${INSTALLER_DIR}/lib/secrets.sh"
source "${INSTALLER_DIR}/lib/config.sh"
source "${INSTALLER_DIR}/lib/migrate.sh"
source "${INSTALLER_DIR}/lib/docker.sh"

wizard_step_welcome() {
  tui_welcome || { WIZARD_CANCELLED=1; return 1; }
  return 0
}

wizard_step_install_dir() {
  if [[ "${FESTSCHMIEDE_INSTALL_DIR_EXPLICIT:-0}" == "1" \
     || "${FESTSCHMIEDE_INSTALL_DIR_PROMPTED:-0}" == "1" ]]; then
    log_info "Installationspfad: ${INSTALL_DIR}"
    return 0
  fi

  local chosen resolved
  chosen=$(tui_input "Installationspfad" "Verzeichnis für die FestSchmiede-Plattform:

Docker-Container, Konfiguration und Daten werden hier abgelegt." \
    "${INSTALL_DIR}") || return 1

  if ! validate_install_dir "$chosen"; then
    tui_msgbox "Fehler" "Ungültiger Pfad: ${chosen}

Bitte einen absoluten Pfad angeben (z. B. /srv/festschmiede oder ~/festschmiede)."
    return 1
  fi

  resolved="$(resolve_install_dir_path "$chosen")"
  if [[ "$resolved" != "$INSTALL_DIR" ]]; then
    if [[ -f "${INSTALL_DIR}/.env" ]]; then
      if ! tui_yesno "Installationspfad" "Unter ${INSTALL_DIR} liegt bereits eine Installation (.env).

Wirklich nach ${resolved} wechseln?"; then
        return 1
      fi
    fi
    relocate_install_tree "$INSTALL_DIR" "$resolved" || return 1
    set_install_dir "$resolved"
  fi

  mkdir -p "$INSTALL_DIR"
  log_info "Installationspfad: ${INSTALL_DIR}"
  return 0
}

wizard_step_system() {
  run_full_detection
  load_existing_env
  load_secrets_from_env
  tui_msgbox "Schritt 1: Systemanalyse" "$(format_detection_report)"
  return 0
}

wizard_step_mode() {
  local default="fresh"
  [[ "${SYS_DETECT[existing_install]}" == "yes" ]] && default="upgrade"

  local mode
  mode=$(tui_menu "Schritt 2: Installationsmodus" "Wählen Sie den Installationsmodus:" \
    "fresh" "Neuinstallation – komplette Erstinstallation" \
    "upgrade" "Upgrade – bestehende Installation aktualisieren" \
    "migration" "Migration – von alter Version migrieren" \
    "repair" "Reparatur – Container neu starten, Config prüfen" \
    "config" "Nur Konfiguration aktualisieren (.env)" \
  ) || return 1

  INSTALL_MODE="$mode"
  case "$mode" in
    fresh) CFG[INSTALL_PROFILE]="${CFG[INSTALL_PROFILE]:-local}" ;;
    upgrade|migration) CFG[INSTALL_PROFILE]="production" ;;
    repair) INSTALL_MODE="repair" ;;
    config) INSTALL_MODE="config" ;;
  esac
  log_info "Installationsmodus: $INSTALL_MODE"
  return 0
}

wizard_step_docker() {
  if [[ "${SYS_DETECT[docker_installed]}" == "yes" ]]; then
    if docker info >/dev/null 2>&1; then
      log_info "Docker: ${SYS_DETECT[docker_version]} – läuft (${#DOCKER_CONTAINERS[@]} Container)"
    else
      if ! tui_yesno "Schritt 3: Docker" "Docker ist installiert, aber der Daemon läuft nicht.

Tipp: sudo systemctl start docker

Trotzdem fortfahren?"; then
        WIZARD_CANCELLED=1
        return 1
      fi
    fi
  else
    if tui_yesno "Schritt 3: Docker" "Docker ist nicht installiert.

Jetzt installieren?"; then
      install_docker_if_missing || return 1
      detect_docker
    else
      tui_msgbox "Hinweis" "Docker wird für die Installation benötigt.

Bitte installieren Sie Docker manuell und starten Sie den Assistenten erneut."
      WIZARD_CANCELLED=1
      return 1
    fi
  fi
  return 0
}

wizard_pick_existing_proxy_type() {
  local default="traefik"
  [[ "${SYS_DETECT[proxy_detected]:-none}" != "none" ]] && default="${SYS_DETECT[proxy_detected]}"

  local choice
  choice=$(tui_radiolist "Schritt 4b: Proxy-Typ" "Welchen Reverse Proxy verwenden Sie?

Der Assistent erzeugt passende Docker-Labels (Traefik)
oder Konfigurationsvorlagen (nginx, Caddy, …)." \
    "traefik" "Traefik (Docker-Labels im Compose-File)" "$([[ "$default" == "traefik" ]] && echo on || echo off)" \
    "nginx" "nginx" "$([[ "$default" == "nginx" ]] && echo on || echo off)" \
    "caddy" "Caddy" "$([[ "$default" == "caddy" ]] && echo on || echo off)" \
    "apache" "Apache httpd" "$([[ "$default" == "apache" ]] && echo on || echo off)" \
    "haproxy" "HAProxy" "$([[ "$default" == "haproxy" ]] && echo on || echo off)" \
    "other" "Sonstiger Proxy (nur Netzwerk-Anbindung)" "$([[ "$default" == "other" ]] && echo on || echo off)" \
  ) || return 1

  CFG[PROXY_MODE]="$choice"
  CFG[PROXY_DEPLOYMENT]="external"
  log_info "Externer Proxy-Typ: $choice"
  return 0
}

wizard_step_proxy() {
  local detected="${SYS_DETECT[proxy_detected]}"
  local proxy_list
  proxy_list="Erkannt: ${detected}

Traefik: ${SYS_DETECT[proxy_traefik]}
NGINX:   ${SYS_DETECT[proxy_nginx]}
Caddy:   ${SYS_DETECT[proxy_caddy]}"

  local choice
  choice=$(tui_radiolist "Schritt 4: Reverse Proxy" "${proxy_list}

Reverse Proxy konfigurieren:" \
    "none" "Keiner (lokale Ports nach außen)" "on" \
    "traefik" "Traefik (mit Let's Encrypt, im Stack)" "off" \
    "existing" "Vorhandenen Proxy verwenden" "off" \
    "nginx_manual" "NGINX auf dem Host (manuell)" "off" \
  ) || return 1

  case "$choice" in
    none)
      CFG[PROXY_MODE]="none"
      CFG[PROXY_DEPLOYMENT]="none"
      CFG[USES_REVERSE_PROXY]="no"
      CFG[INSTALL_PROFILE]="local"
      CFG[HTTPS_ENABLED]="no"
      log_info "Kein Reverse Proxy: Host-Ports nach außen, kein zusätzliches Proxy-Netzwerk"
      ;;
    traefik)
      CFG[PROXY_MODE]="traefik"
      CFG[PROXY_DEPLOYMENT]="bundled"
      CFG[USES_REVERSE_PROXY]="yes"
      CFG[INSTALL_PROFILE]="production"
      CFG[HTTPS_ENABLED]="yes"
      ;;
    existing)
      CFG[USES_REVERSE_PROXY]="yes"
      CFG[INSTALL_PROFILE]="production"
      wizard_pick_existing_proxy_type || return 1
      ;;
    nginx_manual)
      CFG[PROXY_MODE]="nginx"
      CFG[PROXY_DEPLOYMENT]="manual"
      CFG[USES_REVERSE_PROXY]="yes"
      CFG[INSTALL_PROFILE]="production"
      ;;
  esac
  log_info "Reverse Proxy: ${CFG[PROXY_MODE]} (${CFG[PROXY_DEPLOYMENT]:-none}), internes Netz: festschmiede_internal"
  return 0
}

wizard_step_network() {
  # Wird von run_wizard übersprungen, wenn USES_REVERSE_PROXY != yes
  CFG[DOCKER_INTERNAL_NETWORK]="festschmiede_internal"

  local menu_items=()
  local net

  menu_items+=("new" "Neues Proxy-Netzwerk erstellen (festschmiede_public)")
  for net in "${DOCKER_NETWORKS[@]}"; do
    local name="${net%%|*}"
    local driver="${net#*|}"
    local desc
    desc="$(network_description "$name") ($driver)"
    menu_items+=("$name" "$desc")
  done

  local choice
  choice=$(tui_menu "Schritt 5: Proxy-Netzwerk" "Reverse-Proxy-Netzwerk wählen:

Internes Netz festschmiede_internal wird immer automatisch erstellt
(Backend, DB, Redis, Frontend kommunizieren darüber).

Nur der Frontend-Container wird zusätzlich an das
Proxy-Netzwerk angeschlossen." "${menu_items[@]}") || return 1

  if [[ "$choice" == "new" ]]; then
    CFG[DOCKER_PROXY_NETWORK]="festschmiede_public"
    CFG[DOCKER_NETWORK]="festschmiede_public"
    CFG[DOCKER_NETWORK_CREATE]="yes"
  else
    CFG[DOCKER_PROXY_NETWORK]="$choice"
    CFG[DOCKER_NETWORK]="$choice"
    CFG[DOCKER_NETWORK_CREATE]="no"
  fi
  log_info "Proxy-Netzwerk: ${CFG[DOCKER_PROXY_NETWORK]} (Frontend), intern: ${CFG[DOCKER_INTERNAL_NETWORK]}"
  return 0
}

wizard_step_domain() {
  if [[ "${CFG[INSTALL_PROFILE]:-local}" == "local" && "${CFG[USES_REVERSE_PROXY]:-no}" != "yes" ]]; then
    CFG[PLATFORM_DOMAIN]="localhost"
    log_info "Lokales Profil: Domain localhost, kein HTTPS"
    return 0
  fi

  prompt_until_valid "Schritt 6: Domain" "Basis-Domain (z.B. festschmiede.example.de):" validate_domain "festschmiede.local" PLATFORM_DOMAIN || return 1

  CFG[WWW_SUBDOMAIN]=$(tui_input "WWW-Subdomain" "Subdomain für Homepage:" "${CFG[WWW_SUBDOMAIN]:-www}") || return 1
  CFG[APP_SUBDOMAIN]=$(tui_input "APP-Subdomain" "Subdomain für Plattform-Admin:" "${CFG[APP_SUBDOMAIN]:-app}") || return 1
  CFG[PLATFORM_WILDCARD_DOMAIN]="*.${CFG[PLATFORM_DOMAIN]}"

  local https_prompt
  if [[ "${CFG[PROXY_MODE]:-}" == "traefik" && "${CFG[PROXY_DEPLOYMENT]:-}" == "bundled" ]]; then
    https_prompt="Let's Encrypt (HTTPS) aktivieren?

Erfordert gültige DNS-Einträge für ${CFG[PLATFORM_DOMAIN]} und *.${CFG[PLATFORM_DOMAIN]}"
  elif [[ "${CFG[PROXY_MODE]:-}" == "traefik" && "${CFG[PROXY_DEPLOYMENT]:-}" == "external" ]]; then
    https_prompt="Traefik TLS-Labels im Compose-File setzen?

Der vorhandene Traefik muss den Cert-Resolver kennen
(oder TLS wird ohne Resolver gesetzt)."
  else
    https_prompt="HTTPS aktivieren?

URLs und CORS werden auf https:// gesetzt (Zertifikat konfigurieren Sie am Reverse Proxy)."
  fi

  if tui_yesno "HTTPS" "$https_prompt"; then
    CFG[HTTPS_ENABLED]="yes"
    if [[ "${CFG[PROXY_MODE]:-}" == "traefik" && "${CFG[PROXY_DEPLOYMENT]:-}" == "bundled" ]]; then
      prompt_until_valid "ACME E-Mail" "E-Mail für Let's Encrypt:" validate_email "admin@${CFG[PLATFORM_DOMAIN]}" ACME_EMAIL || return 1
    elif [[ "${CFG[PROXY_MODE]:-}" == "traefik" && "${CFG[PROXY_DEPLOYMENT]:-}" == "external" ]]; then
      CFG[TRAEFIK_CERT_RESOLVER]=$(tui_input "Traefik Cert-Resolver" "Name des Certificate Resolvers auf Ihrem Traefik (leer = tls ohne Resolver):" "${CFG[TRAEFIK_CERT_RESOLVER]:-letsencrypt}") || return 1
    fi
  fi
  return 0
}

wizard_step_platform() {
  CFG[PLATFORM_NAME]=$(tui_input "Schritt 7: Plattform" "Plattformname:" "${CFG[PLATFORM_NAME]:-FestSchmiede}") || return 1
  CFG[PLATFORM_TIMEZONE]=$(tui_input "Zeitzone" "Zeitzone (IANA):" "${CFG[PLATFORM_TIMEZONE]:-Europe/Berlin}") || return 1
  CFG[PLATFORM_LOCALE]=$(tui_input "Sprache" "Standard-Sprache:" "${CFG[PLATFORM_LOCALE]:-de-DE}") || return 1
  return 0
}

wizard_step_database() {
  local choice
  choice=$(tui_radiolist "Schritt 8: Datenbank" "Datenbank-Modus:" \
    "internal" "Intern (PostgreSQL im Docker-Container)" "on" \
    "external" "Extern (eigener PostgreSQL-Server)" "off" \
  ) || return 1

  CFG[DB_MODE]="$choice"
  if [[ "$choice" == "external" ]]; then
  CFG[DATABASE_URL]=$(tui_input "Datenbank-URL" "PostgreSQL Connection String:" "${CFG[DATABASE_URL]:-postgresql://user:pass@host:5432/db}") || return 1
  fi
  return 0
}

wizard_step_redis() {
  local choice
  choice=$(tui_radiolist "Schritt 9: Redis" "Redis für Sessions/Cache:" \
    "no" "Kein Redis" "on" \
    "internal" "Intern (Redis-Container)" "off" \
    "external" "Extern (REDIS_URL)" "off" \
  ) || return 1

  CFG[USE_REDIS]="$choice"
  if [[ "$choice" == "external" ]]; then
    CFG[REDIS_URL]=$(tui_input "Redis URL" "REDIS_URL:" "${CFG[REDIS_URL]:-redis://localhost:6379}") || return 1
  fi
  return 0
}

wizard_step_mail() {
  if ! tui_yesno "Schritt 10: Mail" "SMTP für E-Mail-Versand jetzt konfigurieren?
(Kann später unter /platform/email erfolgen)"; then
    CFG[SMTP_ENABLED]="no"
    return 0
  fi

  CFG[SMTP_ENABLED]="yes"
  CFG[SMTP_HOST]=$(tui_input "SMTP Host" "SMTP-Server:" "${CFG[SMTP_HOST]:-smtp.example.com}") || return 1
  CFG[SMTP_PORT]=$(tui_input "SMTP Port" "Port (587=STARTTLS, 465=SSL):" "${CFG[SMTP_PORT]:-587}") || return 1
  CFG[SMTP_USER]=$(tui_input "SMTP Benutzer" "Benutzername (optional):" "${CFG[SMTP_USER]:-}") || return 1
  CFG[SMTP_PASS]=$(tui_password "SMTP Passwort" "Passwort (optional):") || true
  CFG[SMTP_FROM]=$(tui_input "Absender" "Absender-E-Mail:" "${CFG[SMTP_FROM]:-noreply@${CFG[PLATFORM_DOMAIN]}}") || return 1

  if tui_yesno "Testmail" "Testmail nach Installation senden?"; then
    CFG[SMTP_TEST]="yes"
    CFG[SMTP_TEST_RECIPIENT]=$(tui_input "Empfänger" "Testmail an:" "${CFG[PLATFORM_ADMIN_EMAIL]:-}") || return 1
  fi
  return 0
}

wizard_step_security() {
  generate_all_secrets

  local summary
  summary=$(format_secrets_summary)
  summary="${summary}

Sichere Zufallswerte wurden generiert."

  if tui_yesno "Schritt 11: Sicherheit" "${summary}

Übernehmen?"; then
    return 0
  fi

  if tui_yesno "Eigene Werte" "Eigene Secrets eingeben?"; then
    CFG[JWT_SECRET]=$(tui_password "JWT_SECRET" "JWT Secret (min. 32 Zeichen):") || return 1
    validate_secret_length "${CFG[JWT_SECRET]}" 32 || { tui_msgbox "Fehler" "JWT_SECRET zu kurz"; return 1; }
    CFG[APP_ENCRYPTION_KEY]=$(tui_password "APP_ENCRYPTION_KEY" "Encryption Key (min. 32 Zeichen):") || return 1
    CFG[PLATFORM_ADMIN_PASSWORD]=$(tui_password "Admin-Passwort" "Plattform-Admin-Passwort:") || return 1
  fi
  return 0
}

wizard_step_summary() {
  apply_defaults
  local summary
  summary=$(format_config_summary)
  summary="${summary}

Installationsverzeichnis:
  ${INSTALL_DIR}

Protokoll:
  ${LOG_FILE}"

  if tui_summary_confirm "$summary"; then
    return 0
  fi
  WIZARD_CANCELLED=1
  return 1
}

wizard_step_success() {
  apply_defaults
  local body access docker_report
  access=$(get_access_urls)
  docker_report=$(docker_status_report)

  body="FestSchmiede wurde erfolgreich installiert!

--- Zugang ---
${access}

--- Administrator ---
E-Mail:    ${CFG[PLATFORM_ADMIN_EMAIL]:-platform@festschmiede.local}
Passwort:  ${CFG[PLATFORM_ADMIN_PASSWORD]}
(Bitte sicher aufbewahren!)

--- Docker ---
${docker_report}
--- Pfade ---
Installiert:  ${INSTALL_DIR}
Protokoll:    ${LOG_FILE}
Backup:       ${BACKUP_DIR}

Tipp: Regelmäßige Backups mit scripts/backup/postgres-backup.sh"

  if proxy_generates_config_files || proxy_generates_traefik_labels; then
    body="${body}

--- Reverse Proxy ---
Vorlagen/Labels: ${INSTALL_DIR}/installer/generated/"
    if proxy_generates_traefik_labels; then
      body="${body}
Traefik-Labels in compose.override.yml"
    fi
    if proxy_generates_config_files; then
      body="${body}
Konfiguration: installer/generated/proxy/"
    fi
  fi

  tui_success "$body"

  # Credentials sicher speichern
  local cred_file="${STATE_DIR}/credentials.txt"
  {
    echo "# FestSchmiede Installations-Credentials"
    echo "# $(date -Iseconds)"
    echo "PLATFORM_ADMIN_EMAIL=${CFG[PLATFORM_ADMIN_EMAIL]:-platform@festschmiede.local}"
    echo "PLATFORM_ADMIN_PASSWORD=${CFG[PLATFORM_ADMIN_PASSWORD]}"
  } >"$cred_file"
  chmod 600 "$cred_file"
  log_info "Credentials gespeichert: $cred_file"
}

wizard_should_skip_step() {
  [[ "$1" == "wizard_step_network" && "${CFG[USES_REVERSE_PROXY]:-no}" != "yes" ]] \
    || [[ "$1" == "wizard_step_network" && "${CFG[PROXY_DEPLOYMENT]:-}" == "manual" ]]
}

run_wizard() {
  _detect_tui_backend
  local steps=(
    wizard_step_welcome
    wizard_step_install_dir
    wizard_step_system
    wizard_step_mode
    wizard_step_docker
    wizard_step_proxy
    wizard_step_network
    wizard_step_domain
    wizard_step_platform
    wizard_step_database
    wizard_step_redis
    wizard_step_mail
    wizard_step_security
    wizard_step_summary
  )

  local i=0
  local total=${#steps[@]}
  local wizard_nav=""

  while [[ $i -lt $total ]]; do
  WIZARD_STEP=$i
  save_state

  if wizard_should_skip_step "${steps[$i]}"; then
    CFG[DOCKER_INTERNAL_NETWORK]="${CFG[DOCKER_INTERNAL_NETWORK]:-festschmiede_internal}"
    log_info "Schritt Proxy-Netzwerk entfällt (kein Reverse Proxy)"
    if [[ "$wizard_nav" == "back" ]]; then
      i=$((i - 1))
    else
      i=$((i + 1))
    fi
    wizard_nav=""
    continue
  fi

  local step_name="Schritt $((i+1))/$total"
  log_info "Wizard: $step_name – ${steps[$i]}"

  if ! "${steps[$i]}"; then
    if [[ $WIZARD_CANCELLED -eq 1 ]]; then
      log_info "Installation vom Benutzer abgebrochen"
      return 1
    fi
    continue
  fi

  # Navigation nur im Plain-Modus (dialog/gum: Schritte haben eigene Buttons)
  if [[ $i -gt 0 && $i -lt $((total-1)) ]] && [[ "${TUI_BACKEND:-}" == "plain" ]]; then
    tui_nav "$step_name"
    local nav=$?
    case $nav in
      0) wizard_nav="back"; i=$((i-1)); continue ;;
      2) WIZARD_CANCELLED=1; return 1 ;;
    esac
  fi

  wizard_nav=""
  i=$((i+1))
  done

  return 0
}
