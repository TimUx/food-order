#!/usr/bin/env bash
# FestSchmiede Installer – Professioneller interaktiver Installations-Assistent (TUI)
# Version 2.4.0

set -euo pipefail

INSTALLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

_parse_installer_args() {
  REMAINING_ARGS=()
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -d|--dir)
        [[ $# -ge 2 ]] || { echo "FEHLER: --dir erfordert Pfad" >&2; exit 1; }
        INSTALL_DIR="$2"
        shift
        ;;
      -h|--help|--update|--repair|--backup|--validate|--validate-update)
        break
        ;;
      *)
        echo "FEHLER: Unbekannte Option: $1" >&2
        exit 1
        ;;
    esac
    shift
  done
  REMAINING_ARGS=("$@")
}

_parse_installer_args "$@"
set -- "${REMAINING_ARGS[@]}"

if [[ -z "${INSTALL_DIR:-}" ]]; then
  INSTALL_DIR="$(cd "${INSTALLER_DIR}/.." && pwd)"
fi

# Bibliotheken laden
# shellcheck source=installer/lib/common.sh
source "${INSTALLER_DIR}/lib/common.sh"
source "${INSTALLER_DIR}/lib/tui.sh"
source "${INSTALLER_DIR}/lib/detect.sh"
source "${INSTALLER_DIR}/lib/validate.sh"
source "${INSTALLER_DIR}/lib/secrets.sh"
source "${INSTALLER_DIR}/lib/config.sh"
source "${INSTALLER_DIR}/lib/migrate.sh"
source "${INSTALLER_DIR}/lib/docker.sh"
source "${INSTALLER_DIR}/lib/rollback.sh"
source "${INSTALLER_DIR}/lib/operations.sh"
source "${INSTALLER_DIR}/lib/wizard.sh"

show_help() {
  cat <<EOF
FestSchmiede Installations-Assistent v${INSTALLER_VERSION}

Verwendung:
  ./installer/install.sh              Vollständiger Wizard (Neuinstallation/Upgrade)
  ./installer/install.sh --update     Geführtes Update (Bootstrap → Backup → Migration → Health)
  ./installer/install.sh --repair     Reparatur (Neustart + Health)
  ./installer/install.sh --backup     Nur Datenbank-Backup
  ./installer/install.sh --validate   Prüft Update-Voraussetzungen (ohne Änderungen)

Optionen:
  -d, --dir PATH   Installationsverzeichnis (Plattform-Root)

Umgebungsvariablen:
  INSTALL_DIR                      Installationsverzeichnis
  FESTSCHMIEDE_NONINTERACTIVE=1    Keine TUI-Dialoge (für Skripte/CI)
  IMAGE_TAG                        Image-Tag für Update (überschreibt .env, z. B. v2.4.36)
  FESTSCHMIEDE_AUTO_DB_ROLLBACK=1  DB bei fehlgeschlagenem Update automatisch wiederherstellen (Standard: aus)

Protokoll: installer/logs/
EOF
}

run_guided_mode() {
  local mode="$1"

  # Update/Repair immer über Root-install.sh, damit zuerst der Bootstrap kommt.
  if [[ "$mode" == "update" || "$mode" == "repair" ]]; then
    if [[ "${FESTSCHMIEDE_BOOTSTRAP_DONE:-}" != "1" && -x "${INSTALL_DIR}/install.sh" && ! -d "${INSTALL_DIR}/.git" ]]; then
      log_info "Starte Update über Installations-Bootstrap (Phase 1: Installer, dann Anwendung)..."
      exec env FESTSCHMIEDE_INSTALL_DIR="$INSTALL_DIR" FESTSCHMIEDE_INSTALL_DIR_EXPLICIT=1 \
        "${INSTALL_DIR}/install.sh" --"${mode}"
    fi
  fi

  log_info "=== Geführter Modus: $mode ==="
  load_existing_env
  load_secrets_from_env

  case "$mode" in
    update)
      if ! run_guided_update; then
        handle_install_error "Update fehlgeschlagen — siehe Meldungen oben"
        return 1
      fi
      if [[ "${FESTSCHMIEDE_NONINTERACTIVE:-}" != "1" ]]; then
        tui_msgbox "Update erfolgreich" "Die Plattform wurde aktualisiert.\n\nHealth-Check: OK\nProtokoll: $LOG_FILE"
      else
        echo "Update erfolgreich. Health-Check: OK"
      fi
      ;;
    repair)
      run_guided_repair || { handle_install_error "Reparatur fehlgeschlagen"; return 1; }
      tui_msgbox "Reparatur" "Container wurden neu gestartet.\nHealth-Check: OK" 2>/dev/null || echo "Reparatur OK"
      ;;
    backup)
      local path
      path=$(run_guided_backup) || return 1
      echo "Backup: $path"
      ;;
    validate)
      echo "Prüfe Update-Voraussetzungen..."
      if validate_update_readiness; then
        echo "OK — Update kann durchgeführt werden (./install.sh --update)"
        return 0
      fi
      echo "FEHLER — Voraussetzungen nicht erfüllt"
      return 1
      ;;
  esac
  return 0
}

main() {
  case "${1:-}" in
    -h|--help) show_help; exit 0 ;;
    --update) export FESTSCHMIEDE_NONINTERACTIVE="${FESTSCHMIEDE_NONINTERACTIVE:-1}"; run_guided_mode update; exit $? ;;
    --repair) run_guided_mode repair; exit $? ;;
    --backup) run_guided_mode backup; exit $? ;;
    --validate|--validate-update) run_guided_mode validate; exit $? ;;
  esac

  log_info "=== FestSchmiede Installer v${INSTALLER_VERSION} gestartet ==="
  log_info "Installationsverzeichnis: $INSTALL_DIR"
  log_info "Protokoll: $LOG_FILE"
  if [[ "${FESTSCHMIEDE_ONLINE_INSTALL:-}" == "1" ]]; then
    log_info "Modus: Online-Installation (ohne Git-Clone)"
  fi

  if [[ $EUID -eq 0 ]]; then
    log_warn "Installer läuft als root"
  fi

  load_state
  load_existing_env

  if ! run_wizard; then
    if [[ $WIZARD_CANCELLED -eq 1 ]]; then
      tui_msgbox "Abgebrochen" "Installation abgebrochen.\n\nProtokoll: $LOG_FILE"
      exit 0
    fi
    exit 1
  fi

  create_pre_install_backup

  # Upgrade/Migration: geführter Betriebsablauf statt Voll-Installation
  if [[ "$INSTALL_MODE" == "upgrade" || "$INSTALL_MODE" == "migration" ]]; then
    if [[ "${FESTSCHMIEDE_NONINTERACTIVE:-}" == "1" ]] || tui_yesno "Geführtes Update" "Der Assistent führt jetzt aus:\n\n1. Datenbank-Backup\n2. Neue Images laden\n3. Migration\n4. Health-Check\n5. Rollback bei Fehler\n\nFortfahren?"; then
      run_guided_mode update && exit 0
    fi
  fi

  if [[ "$INSTALL_MODE" == "repair" ]]; then
    run_guided_mode repair && exit 0
  fi

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

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
