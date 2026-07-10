#!/bin/sh
# FestSchmiede Backend – Produktionsstart mit kontrollierten Migrationen
# 1. Optional: DB-Backup vor ausstehenden Migrationen
# 2. prisma migrate deploy (inkl. Baseline für bestehende db-push-Installationen)
# 3. App starten
set -eu

INIT_MIGRATION="20260710140000_init"
BACKUP_DIR="${FESTSCHMIEDE_BACKUP_DIR:-/app/backups}"
SKIP_BACKUP="${FESTSCHMIEDE_SKIP_PRE_MIGRATION_BACKUP:-}"

_log() { echo "[entrypoint] $*"; }
_err() { echo "[entrypoint] FEHLER: $*" >&2; }

_need_cmd() {
  command -v "$1" >/dev/null 2>&1 || { _err "Befehl '$1' nicht gefunden"; exit 1; }
}

_parse_db_url() {
  # postgresql://user:pass@host:port/db
  local url="${DATABASE_URL:?DATABASE_URL fehlt}"
  DB_USER="$(echo "$url" | sed -n 's|.*://\([^:]*\):.*|\1|p')"
  DB_PASS="$(echo "$url" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')"
  DB_HOST="$(echo "$url" | sed -n 's|.*@\([^:]*\):.*|\1|p')"
  DB_PORT="$(echo "$url" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')"
  DB_NAME="$(echo "$url" | sed -n 's|.*/\([^?]*\).*|\1|p')"
  DB_HOST="${DB_HOST:-postgres}"
  DB_PORT="${DB_PORT:-5432}"
}

_has_pending_migrations() {
  local status
  status="$(npx prisma migrate status 2>&1 || true)"
  echo "$status" | grep -qiE 'not yet been applied|following migrations have not|To apply migrations'
}

_db_has_application_data() {
  _parse_db_url
  local result
  result="$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('tenants','platform_users','User') LIMIT 1" 2>/dev/null || true)"
  [ -n "$result" ]
}

_create_pre_migration_backup() {
  if [ "$SKIP_BACKUP" = "1" ]; then
    _log "Pre-Migration-Backup übersprungen (FESTSCHMIEDE_SKIP_PRE_MIGRATION_BACKUP=1)"
    return 0
  fi

  if ! _db_has_application_data; then
    _log "Leere Datenbank – kein Backup erforderlich"
    return 0
  fi

  _need_cmd pg_dump
  _parse_db_url

  mkdir -p "$BACKUP_DIR"
  local file="${BACKUP_DIR}/pre-migrate-$(date +%Y%m%d-%H%M%S).sql.gz"
  _log "Erstelle Pre-Migration-Backup: $file"

  PGPASSWORD="$DB_PASS" pg_dump \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-acl | gzip > "$file"

  _log "Backup erstellt ($(du -h "$file" | cut -f1))"
}

_baseline_existing_db_if_needed() {
  local err_file
  err_file="$(mktemp)"

  if npx prisma migrate deploy > /tmp/migrate.out 2>"$err_file"; then
    cat /tmp/migrate.out
    rm -f "$err_file" /tmp/migrate.out
    return 0
  fi

  if grep -q "P3005" "$err_file" || grep -qi "not empty" "$err_file"; then
    _log "Bestehende Datenbank ohne Migrate-Historie – Baseline auf ${INIT_MIGRATION}"
    npx prisma migrate resolve --applied "$INIT_MIGRATION"
    npx prisma migrate deploy
    rm -f "$err_file" /tmp/migrate.out
    return 0
  fi

  cat /tmp/migrate.out 2>/dev/null || true
  cat "$err_file" >&2
  rm -f "$err_file" /tmp/migrate.out
  exit 1
}

_run_migrations() {
  _log "Prüfe ausstehende Migrationen..."
  if _has_pending_migrations; then
    _log "Ausstehende Migrationen gefunden – Backup wird erstellt"
    _create_pre_migration_backup
  else
    _log "Keine ausstehenden Migrationen (oder leere Datenbank)"
  fi

  _log "Wende Prisma-Migrationen an (migrate deploy)..."
  _baseline_existing_db_if_needed
  _log "Migrationen abgeschlossen"
}

_start_app() {
  _log "Starte Anwendung..."
  exec node dist/src/index.js
}

case "${1:-start}" in
  migrate)
    _run_migrations
    ;;
  start)
    _run_migrations
    _start_app
    ;;
  *)
    exec "$@"
    ;;
esac
