#!/usr/bin/env bash
# FestSchmiede Installer – Eingabevalidierung

validate_domain() {
  local domain="$1"
  [[ "$domain" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]
}

validate_email() {
  local email="$1"
  [[ "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]
}

validate_port() {
  local port="$1"
  [[ "$port" =~ ^[0-9]+$ ]] && (( port >= 1 && port <= 65535 ))
}

validate_install_dir() {
  local path="$1" resolved
  resolved="$(resolve_install_dir_path "$path" 2>/dev/null)" || return 1
  [[ -n "$resolved" && "$resolved" == /* ]]
}

validate_path() {
  local path="$1"
  [[ -d "$(dirname "$path")" || "$path" =~ ^/ ]]
}

validate_password_strength() {
  local pass="$1"
  local min="${2:-12}"
  [[ ${#pass} -ge $min ]]
}

validate_smtp_host() {
  local host="$1"
  [[ -n "$host" && "$host" != "localhost" ]] || [[ "$host" == "localhost" && "${CFG[INSTALL_PROFILE]:-}" == "local" ]]
}

validate_secret_length() {
  local secret="$1"
  local min="${2:-32}"
  [[ ${#secret} -ge $min ]]
}

prompt_until_valid() {
  local title="$1" prompt="$2" validator="$3" default="${4:-}" varname="$5"
  local value="" err_msg=""
  while true; do
    value=$(tui_input "$title" "$prompt${err_msg:+ ($err_msg)}" "$default") || return 1
    if $validator "$value"; then
      CFG["$varname"]="$value"
      return 0
    fi
    err_msg="Ungültige Eingabe"
  done
}
