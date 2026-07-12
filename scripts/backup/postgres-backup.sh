#!/usr/bin/env bash
# Postgres-Volume-Backup (N7)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [[ -f "${ROOT_DIR}/scripts/lib/dotenv.sh" ]]; then
  # shellcheck source=scripts/lib/dotenv.sh
  source "${ROOT_DIR}/scripts/lib/dotenv.sh"
else
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
fi

dotenv_export_file "${ROOT_DIR}/.env" \
  POSTGRES_USER POSTGRES_DB POSTGRES_CONTAINER BACKUP_DIR STACK_NAME DEPLOYMENT_MODE

BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILE="${BACKUP_DIR}/festschmiede-${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

POSTGRES_USER="${POSTGRES_USER:-festschmiede}"
POSTGRES_DB="${POSTGRES_DB:-festschmiede}"

resolve_postgres_container() {
  if [[ -n "${POSTGRES_CONTAINER:-}" ]]; then
    printf '%s' "$POSTGRES_CONTAINER"
    return
  fi

  local stack="${STACK_NAME:-festschmiede}"
  local name
  name=$(docker ps --format '{{.Names}}' | grep -E "^${stack}_postgres\\.[0-9]+" | head -1) || true
  if [[ -n "$name" ]]; then
    printf '%s' "$name"
    return
  fi

  printf '%s' "festschmiede-postgres"
}

CONTAINER="$(resolve_postgres_container)"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Fehler: Postgres-Container '$CONTAINER' läuft nicht." >&2
  echo "→ Prüfen Sie: docker compose ps  bzw.  docker service ps ${STACK_NAME:-festschmiede}_postgres" >&2
  exit 1
fi

if ! docker exec "$CONTAINER" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$FILE"; then
  echo "Fehler: pg_dump fehlgeschlagen." >&2
  rm -f "$FILE"
  exit 1
fi

echo "Backup erstellt: $FILE"
