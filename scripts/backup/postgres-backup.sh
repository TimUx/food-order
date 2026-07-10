#!/usr/bin/env bash
# Postgres-Volume-Backup (N7)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILE="${BACKUP_DIR}/vereinsbestellung-${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

POSTGRES_USER="${POSTGRES_USER:-verein}"
POSTGRES_DB="${POSTGRES_DB:-vereinsbestellung}"
CONTAINER="${POSTGRES_CONTAINER:-vereins-postgres}"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Fehler: Postgres-Container '$CONTAINER' läuft nicht." >&2
  echo "→ Prüfen Sie: docker compose ps" >&2
  exit 1
fi

if ! docker exec "$CONTAINER" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$FILE"; then
  echo "Fehler: pg_dump fehlgeschlagen." >&2
  rm -f "$FILE"
  exit 1
fi

echo "Backup erstellt: $FILE"
