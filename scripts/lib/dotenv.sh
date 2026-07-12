#!/usr/bin/env bash
# Sicheres Parsen von .env-Dateien ohne bash "source" (Backticks, $, ||, …).

dotenv_unquote_value() {
  local value="$1"
  value="${value%$'\r'}"
  if [[ ${#value} -ge 2 && "$value" == \'*\' ]]; then
    value="${value:1:${#value}-2}"
  elif [[ ${#value} -ge 2 && "$value" == \"*\" ]]; then
    value="${value:1:${#value}-2}"
  fi
  printf '%s' "$value"
}

# Schreibt Werte mit Shell-Metazeichen in einfache Anführungszeichen.
dotenv_format_value() {
  local val="$1"
  if [[ "$val" =~ [\`\$\(\)\|\;\&\<\>\ \!\#\*\\] ]]; then
    local escaped
    escaped=$(printf '%s' "$val" | sed "s/'/'\\\\''/g")
    printf "'%s'" "$escaped"
  else
    printf '%s' "$val"
  fi
}

dotenv_export_file() {
  local env_file="$1"
  shift
  local filter_keys=("$@")
  local line key value match k

  [[ -f "$env_file" ]] || return 0

  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[A-Z_][A-Z0-9_]*= ]] || continue
    key="${line%%=*}"
    value="$(dotenv_unquote_value "${line#*=}")"

    if [[ ${#filter_keys[@]} -gt 0 ]]; then
      match=0
      for k in "${filter_keys[@]}"; do
        if [[ "$key" == "$k" ]]; then
          match=1
          break
        fi
      done
      [[ $match -eq 1 ]] || continue
    fi

    printf -v "$key" '%s' "$value"
    export "$key"
  done <"$env_file"
}
