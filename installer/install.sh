#!/usr/bin/env bash
# FestSchmiede – Professioneller interaktiver Installations-Assistent (TUI)
# Version 2.2.1

set -euo pipefail

INSTALLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$(cd "${INSTALLER_DIR}/.." && pwd)"

# Bibliotheken laden
# shellcheck source=installer/lib/common.sh
source "${INSTALLER_DIR}/lib/common.sh"
source "${INSTALLER_DIR}/lib/tui.sh"
source "${INSTALLER_DIR}/lib/detect.sh"
source "${INSTALLER_DIR}/lib/validate.sh"
source "${INSTALLER_DIR}/lib/secrets.sh"
source "${INSTALLER_DIR}/lib/config.sh"
source "${INSTALLER_DIR}/lib/docker.sh"
source "${INSTALLER_DIR}/lib/rollback.sh"
source "${INSTALLER_DIR}/lib/wizard.sh"

main() {
  log_info "=== FestSchmiede Installer v${INSTALLER_VERSION} gestartet ==="
  log_info "Installationsverzeichnis: $INSTALL_DIR"
  log_info "Protokoll: $LOG_FILE"
  if [[ "${FESTSCHMIEDE_ONLINE_INSTALL:-}" == "1" ]]; then
    log_info "Modus: Online-Installation (ohne Git-Clone)"
  fi

  # Root-Check (optional warnen)
  if [[ $EUID -eq 0 ]]; then
    log_warn "Installer läuft als root"
  fi

  load_state
  load_existing_env

  # Wizard durchlaufen
  if ! run_wizard; then
    if [[ $WIZARD_CANCELLED -eq 1 ]]; then
      tui_msgbox "Abgebrochen" "Installation abgebrochen.\n\nProtokoll: $LOG_FILE"
      exit 0
    fi
    exit 1
  fi

  # Pre-Install Backup
  create_pre_install_backup

  # Installation ausführen
  local attempt=0
  while [[ $attempt -lt 3 ]]; do
    if run_installation; then
      wizard_step_success
      log_info "=== Installation erfolgreich ==="
      exit 0
    fi

    attempt=$((attempt+1))
    local rc=1
    handle_install_error "Installation fehlgeschlagen (Versuch $attempt/3)" || rc=$?
    [[ $rc -eq 2 ]] && continue
    exit 1
  done

  exit 1
}

# Nur ausführen wenn direkt aufgerufen
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
