#!/usr/bin/env bash
# FestSchmiede – Installations-Bootstrap
# Funktioniert lokal (Git-Clone) und online ohne Repository:
#
#   curl -fsSL https://raw.githubusercontent.com/TimUx/FestSchmiede/v2.4.0/install.sh | bash
#   wget -qO- https://raw.githubusercontent.com/TimUx/FestSchmiede/v2.4.0/install.sh | bash
#
# Online werden nur Plattform-Dateien (Compose, Installer, Backup-Skripte) heruntergeladen.
#
# Umgebungsvariablen:
#   FESTSCHMIEDE_INSTALL_DIR          – Zielverzeichnis (höchste Priorität)
#   FESTSCHMIEDE_DEFAULT_INSTALL_DIR  – Standard-Zielverzeichnis (wenn INSTALL_DIR leer)
#   FESTSCHMIEDE_VERSION              – Release-Tag (Standard: 2.4.0)
#   FESTSCHMIEDE_GITHUB_REPO          – GitHub Repo (Standard: TimUx/FestSchmiede)
#   FESTSCHMIEDE_REF                  – Git-Ref statt Version (z.B. main)
#   FESTSCHMIEDE_BOOTSTRAP_ONLY=1     – Nur Dateien herunterladen

set -euo pipefail

FESTSCHMIEDE_VERSION="${FESTSCHMIEDE_VERSION:-2.4.21}"
FESTSCHMIEDE_GITHUB_REPO="${FESTSCHMIEDE_GITHUB_REPO:-TimUx/FestSchmiede}"
FESTSCHMIEDE_REF="${FESTSCHMIEDE_REF:-}"
FESTSCHMIEDE_INSTALL_DIR="${FESTSCHMIEDE_INSTALL_DIR:-}"
FESTSCHMIEDE_INSTALL_DIR_EXPLICIT=0
# Standard-Installationspfad (leer = automatisch: /opt/festschmiede als root, ~/festschmiede sonst)
FESTSCHMIEDE_DEFAULT_INSTALL_DIR="${FESTSCHMIEDE_DEFAULT_INSTALL_DIR:-}"

_log() { echo "[FestSchmiede] $*"; }
_err() { echo "[FestSchmiede] FEHLER: $*" >&2; }

_show_help() {
  cat <<EOF
FestSchmiede Installations-Assistent

Verwendung:
  ./install.sh                     Lokale Installation (nach Git-Clone)
  curl -fsSL .../install.sh | bash Online-Installation ohne Git-Clone

Installationspfad (Priorität: --dir > FESTSCHMIEDE_INSTALL_DIR > Default):
  -d, --dir PATH                 Zielverzeichnis
  FESTSCHMIEDE_INSTALL_DIR       Zielverzeichnis (Umgebungsvariable)
  FESTSCHMIEDE_DEFAULT_INSTALL_DIR  Standard-Pfad (Standard: /opt/festschmiede als root, ~/festschmiede sonst)

Weitere Umgebungsvariablen:
  FESTSCHMIEDE_VERSION       Release-Version (Standard: ${FESTSCHMIEDE_VERSION})
  FESTSCHMIEDE_REF           Git-Branch/Tag (überschreibt VERSION)
  FESTSCHMIEDE_GITHUB_REPO   GitHub Repository
  FESTSCHMIEDE_BOOTSTRAP_ONLY=1  Nur herunterladen, kein Wizard

Online-Installation:
  curl -fsSL https://raw.githubusercontent.com/${FESTSCHMIEDE_GITHUB_REPO}/v${FESTSCHMIEDE_VERSION}/install.sh | bash

  ./install.sh -d /opt/festschmiede
  FESTSCHMIEDE_INSTALL_DIR=/opt/festschmiede curl -fsSL .../install.sh | bash
  curl -fsSL .../install.sh | bash -s -- -d /opt/festschmiede

Optionen:
  -h, --help       Diese Hilfe
  -d, --dir PATH   Installationsverzeichnis (siehe oben)
  -v, --version    Installer-Version anzeigen
  --bootstrap-only Nur Plattform-Dateien herunterladen
  --update         Geführtes Update (Backup, Migration, Health, Rollback)
  --repair         Reparatur (Neustart + Health)
  --backup         Nur Datenbank-Backup
  --validate       Update-Voraussetzungen prüfen (ohne Änderungen)
EOF
}

_resolve_local_root() {
  local src="${BASH_SOURCE[0]:-}"
  [[ -n "$src" && "$src" != "bash" && -f "$src" ]] || return 1
  local dir
  dir="$(cd "$(dirname "$src")" && pwd)"
  [[ -f "${dir}/installer/install.sh" && -f "${dir}/docker-compose.yml" ]] || return 1
  echo "$dir"
}

_default_install_dir() {
  if [[ -n "$FESTSCHMIEDE_DEFAULT_INSTALL_DIR" ]]; then
    echo "$FESTSCHMIEDE_DEFAULT_INSTALL_DIR"
    return
  fi
  if [[ $EUID -eq 0 ]]; then
    echo "/opt/festschmiede"
  else
    echo "${HOME}/festschmiede"
  fi
}

# Pfad auflösen (~, relative Pfade → absolut)
_resolve_install_dir() {
  local path="$1"
  [[ -z "$path" ]] && return 1

  if [[ "$path" == "~" ]]; then
    path="$HOME"
  elif [[ "$path" == "~/"* ]]; then
    path="${HOME}/${path:2}"
  elif [[ "$path" != /* ]]; then
    path="$(pwd)/$path"
  fi

  mkdir -p "$path"
  cd "$path" && pwd
}

_resolve_target_dir() {
  local fallback="$1"
  local raw="${FESTSCHMIEDE_INSTALL_DIR:-$fallback}"
  _resolve_install_dir "$raw"
}

_parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help) _show_help; exit 0 ;;
      -v|--version) echo "FestSchmiede Installer ${FESTSCHMIEDE_VERSION}"; exit 0 ;;
      -d|--dir)
        [[ $# -ge 2 ]] || { _err "--dir erfordert Pfad"; exit 1; }
        FESTSCHMIEDE_INSTALL_DIR="$2"
        FESTSCHMIEDE_INSTALL_DIR_EXPLICIT=1
        shift
        ;;
      --bootstrap-only) export FESTSCHMIEDE_BOOTSTRAP_ONLY=1 ;;
      --validate-update) export FESTSCHMIEDE_GUIDED_OP=validate ;;
      --update|--repair|--backup|--validate)
        export FESTSCHMIEDE_GUIDED_OP="${1#--}"
        ;;
      *)
        _err "Unbekannte Option: $1"
        _show_help
        exit 1
        ;;
    esac
    shift
  done
}

_need_cmd() {
  command -v "$1" >/dev/null 2>&1 || { _err "Befehl '$1' nicht gefunden"; exit 1; }
}

_github_ref() {
  if [[ -n "$FESTSCHMIEDE_REF" ]]; then
    echo "$FESTSCHMIEDE_REF"
  else
    echo "v${FESTSCHMIEDE_VERSION}"
  fi
}

_github_raw_base() {
  echo "https://raw.githubusercontent.com/${FESTSCHMIEDE_GITHUB_REPO}/$(_github_ref)"
}

_bootstrap_manifest_path() {
  local root="${1:-}"
  echo "${root}/installer/bootstrap-files.txt"
}

_read_bootstrap_manifest() {
  local manifest="$1"
  [[ -f "$manifest" ]] || { _err "Bootstrap-Manifest fehlt: $manifest"; return 1; }
  grep -vE '^\s*(#|$)' "$manifest"
}

_bootstrap_executable_paths() {
  cat <<'EOF'
install.sh
installer/install.sh
scripts/backup/postgres-backup.sh
scripts/backup/postgres-restore.sh
EOF
}

_sync_deployment_file() {
  local src_root="$1" dest_root="$2" rel_path="$3"
  local src="${src_root}/${rel_path}"
  local dest="${dest_root}/${rel_path}"
  mkdir -p "$(dirname "$dest")"
  cp -a "$src" "$dest"
}

_sync_deployment_tree() {
  local src="$1"
  local dest="$2"
  local manifest rel_path

  manifest="$(_bootstrap_manifest_path "$src")"
  while IFS= read -r rel_path; do
    [[ -n "$rel_path" ]] || continue
    [[ -f "${src}/${rel_path}" ]] || { _err "Fehlende Bootstrap-Datei: ${rel_path}"; return 1; }
    _sync_deployment_file "$src" "$dest" "$rel_path"
  done < <(_read_bootstrap_manifest "$manifest")

  while IFS= read -r rel_path; do
    [[ -n "$rel_path" ]] || continue
    chmod +x "${dest}/${rel_path}" 2>/dev/null || true
  done < <(_bootstrap_executable_paths)

  mkdir -p "${dest}/installer/generated" "${dest}/installer/logs"
  _log "Plattform-Dateien installiert in: ${dest}"
}

_download_bootstrap_file() {
  local install_dir="$1" rel_path="$2"
  local url dest

  url="$(_github_raw_base)/${rel_path}"
  dest="${install_dir}/${rel_path}"
  mkdir -p "$(dirname "$dest")"
  curl -fsSL "$url" -o "$dest"
}

_bootstrap_download() {
  local install_dir="$1"
  local manifest rel_path

  _need_cmd curl

  _log "Lade FestSchmiede-Plattformdateien $(_github_ref) herunter..."
  _log "Quelle: $(_github_raw_base)"

  mkdir -p "${install_dir}/installer"
  _download_bootstrap_file "$install_dir" "installer/bootstrap-files.txt"

  manifest="$(_bootstrap_manifest_path "$install_dir")"
  while IFS= read -r rel_path; do
    [[ -n "$rel_path" ]] || continue
    [[ "$rel_path" == "installer/bootstrap-files.txt" ]] && continue
    _log "  → ${rel_path}"
    _download_bootstrap_file "$install_dir" "$rel_path"
  done < <(_read_bootstrap_manifest "$manifest")

  while IFS= read -r rel_path; do
    [[ -n "$rel_path" ]] || continue
    chmod +x "${install_dir}/${rel_path}" 2>/dev/null || true
  done < <(_bootstrap_executable_paths)

  mkdir -p "${install_dir}/installer/generated" "${install_dir}/installer/logs"
  _log "Plattform-Dateien installiert in: ${install_dir}"
}

_bootstrap_verify() {
  local install_dir="$1"
  local manifest rel_path missing=0

  manifest="$(_bootstrap_manifest_path "$install_dir")"
  while IFS= read -r rel_path; do
    [[ -n "$rel_path" ]] || continue
    if [[ ! -f "${install_dir}/${rel_path}" ]]; then
      _err "Fehlende Datei nach Bootstrap: ${rel_path}"
      missing=1
    fi
  done < <(_read_bootstrap_manifest "$manifest")

  for unwanted in backend frontend package.json tests docs; do
    if [[ -e "${install_dir}/${unwanted}" ]]; then
      _err "Unerwartetes Verzeichnis/Datei nach Bootstrap: ${unwanted}"
      missing=1
    fi
  done

  [[ $missing -eq 0 ]] || exit 1
}

_installed_installer_version() {
  local install_dir="$1"
  local file="${install_dir}/installer/lib/common.sh"
  [[ -f "$file" ]] || return 1
  grep -E '^INSTALLER_VERSION=' "$file" | head -1 | cut -d'"' -f2
}

_should_refresh_installation() {
  local install_dir="$1"
  local installed=""

  [[ "${FESTSCHMIEDE_FORCE_DOWNLOAD:-}" == "1" ]] && return 0

  installed="$(_installed_installer_version "$install_dir" 2>/dev/null || true)"
  [[ -z "$installed" ]] && return 0
  [[ "$installed" != "${FESTSCHMIEDE_VERSION}" ]]
}

_refresh_installer_if_needed() {
  local install_dir="$1"

  if ! _should_refresh_installation "$install_dir"; then
    return 0
  fi

  if [[ -d "${install_dir}/.git" ]]; then
    local installed
    installed="$(_installed_installer_version "$install_dir" 2>/dev/null || echo unbekannt)"
    _log "Installer v${installed} — bitte zuerst git pull (lokales Repository)"
    return 0
  fi

  if [[ "${FESTSCHMIEDE_FORCE_DOWNLOAD:-}" == "1" ]]; then
    _log "Erzwinge Neu-Download (FESTSCHMIEDE_FORCE_DOWNLOAD=1)..."
  else
    _log "Aktualisiere Installer-Dateien auf v${FESTSCHMIEDE_VERSION}..."
  fi
  _bootstrap_download "$install_dir"
  _bootstrap_verify "$install_dir"
}

_prompt_install_dir_online() {
  [[ -n "${FESTSCHMIEDE_INSTALL_DIR:-}" ]] && return 0
  [[ "${FESTSCHMIEDE_NONINTERACTIVE:-}" == "1" ]] && return 0
  [[ -n "${FESTSCHMIEDE_GUIDED_OP:-}" ]] && return 0
  [[ "${FESTSCHMIEDE_BOOTSTRAP_ONLY:-}" == "1" ]] && return 0

  local default="$(_default_install_dir)" chosen resolved
  if [[ -f "${default}/docker-compose.yml" ]]; then
    default="$(_resolve_install_dir "$default")"
  fi

  if command -v dialog >/dev/null 2>&1; then
    chosen=$(dialog --backtitle "FestSchmiede Installer v${FESTSCHMIEDE_VERSION}" \
      --title "Installationspfad" \
      --inputbox "Verzeichnis für die FestSchmiede-Plattform:

Docker-Container, Konfiguration und Daten werden hier abgelegt." 12 78 "$default" \
      3>&1 1>&2 2>&3) || exit 0
  elif command -v whiptail >/dev/null 2>&1; then
    chosen=$(whiptail --backtitle "FestSchmiede Installer v${FESTSCHMIEDE_VERSION}" \
      --title "Installationspfad" \
      --inputbox "Verzeichnis für die FestSchmiede-Plattform (Container, Config, Daten):" 12 78 "$default" \
      3>&1 1>&2 2>&3) || exit 0
  else
    echo "Installationspfad wählen (Standard: ${default})"
    read -r -p "Pfad [${default}]: " chosen
    chosen="${chosen:-$default}"
  fi

  resolved="$(_resolve_install_dir "$chosen")" || { _err "Pfad ungültig: ${chosen}"; exit 1; }
  FESTSCHMIEDE_INSTALL_DIR="$resolved"
  export FESTSCHMIEDE_INSTALL_DIR_PROMPTED=1
  _log "Installationspfad gewählt: ${FESTSCHMIEDE_INSTALL_DIR}"
}

_run_installer() {
  local install_dir="$1"
  shift
  export INSTALL_DIR="$install_dir"
  export FESTSCHMIEDE_ONLINE_INSTALL=1
  export FESTSCHMIEDE_INSTALL_DIR_EXPLICIT="${FESTSCHMIEDE_INSTALL_DIR_EXPLICIT}"
  export FESTSCHMIEDE_INSTALL_DIR_PROMPTED="${FESTSCHMIEDE_INSTALL_DIR_PROMPTED:-0}"
  exec "${install_dir}/installer/install.sh" "$@"
}

main() {
  _parse_args "$@"

  local guided_args=()
  if [[ -n "${FESTSCHMIEDE_GUIDED_OP:-}" ]]; then
    guided_args=(--"${FESTSCHMIEDE_GUIDED_OP}")
    export FESTSCHMIEDE_NONINTERACTIVE="${FESTSCHMIEDE_NONINTERACTIVE:-1}"
  fi

  local local_root=""
  local_root="$(_resolve_local_root 2>/dev/null || true)"

  if [[ -n "$local_root" ]]; then
    # Lokaler Modus: aus Git-Clone
    local target
    target="$(_resolve_target_dir "$local_root")"
    _log "Lokale Installation aus: ${local_root}"
    if [[ "$target" != "$local_root" ]]; then
      _log "Kopiere Plattform-Dateien nach ${target}..."
      _sync_deployment_tree "$local_root" "$target"
    fi
    if [[ "${FESTSCHMIEDE_BOOTSTRAP_ONLY:-}" == "1" ]]; then
      _log "Bootstrap abgeschlossen (lokal)"
      exit 0
    fi
    if [[ -n "${FESTSCHMIEDE_GUIDED_OP:-}" ]]; then
      _refresh_installer_if_needed "$target"
    fi
    _run_installer "$target" "${guided_args[@]}"
    return
  fi

  # Online-Modus
  _prompt_install_dir_online
  local target
  target="$(_resolve_target_dir "$(_default_install_dir)")"
  _log "Online-Installation (ohne Git-Clone)"
  _log "Zielverzeichnis: ${target}"

  if [[ -f "${target}/docker-compose.yml" && -f "${target}/installer/install.sh" ]]; then
    local installed_version=""
    installed_version="$(_installed_installer_version "$target" 2>/dev/null || true)"
    if [[ -n "$installed_version" ]]; then
      _log "Bestehende Installation gefunden (Installer v${installed_version})"
    else
      _log "Bestehende Installation gefunden"
    fi
    if _should_refresh_installation "$target"; then
      _refresh_installer_if_needed "$target"
    fi
  else
    _bootstrap_download "$target"
  fi

  _bootstrap_verify "$target"

  if [[ "${FESTSCHMIEDE_BOOTSTRAP_ONLY:-}" == "1" ]]; then
    _log "Bootstrap abgeschlossen. Assistent starten mit:"
    _log "  ${target}/install.sh"
    exit 0
  fi

  _run_installer "$target" "${guided_args[@]}"
}

main "$@"
