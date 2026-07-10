#!/usr/bin/env bash
# CI: Prisma Migrate – frische DB und Upgrade von db-push
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND="${ROOT}/backend"
CONTAINER="festschmiede-migrate-test"
PORT=55432
DB_USER=verein
DB_PASS=verein_secret
DB_NAME_FRESH=vereinsbestellung_fresh
DB_NAME_UPGRADE=vereinsbestellung_upgrade
DATABASE_URL_FRESH="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:${PORT}/${DB_NAME_FRESH}"
DATABASE_URL_UPGRADE="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:${PORT}/${DB_NAME_UPGRADE}"

PASS=0
FAIL=0

pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

wait_for_pg() {
  local i
  for i in $(seq 1 60); do
    if docker exec "$CONTAINER" pg_isready -U "$DB_USER" >/dev/null 2>&1; then
      sleep 2
      return 0
    fi
    sleep 1
  done
  return 1
}

ensure_container_running() {
  docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true
}

run_prisma() {
  local db_url="$1"
  shift
  docker run --rm \
    --network host \
    -e DATABASE_URL="$db_url" \
    -e FESTSCHMIEDE_SKIP_PRE_MIGRATION_BACKUP=1 \
    -v "${BACKEND}:/app" \
    -w /app \
    node:22-alpine \
    sh -c "npm ci --omit=dev >/dev/null 2>&1 && $*"
}

echo "=== Migration Tests ==="

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" \
  -e POSTGRES_USER="$DB_USER" \
  -e POSTGRES_PASSWORD="$DB_PASS" \
  -e POSTGRES_DB=postgres \
  -p "${PORT}:5432" \
  postgres:16-alpine >/dev/null

wait_for_pg || { fail "Postgres start"; exit 1; }
ensure_container_running || { fail "Postgres container not running"; exit 1; }

docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DB_NAME_FRESH};" >/dev/null
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DB_NAME_UPGRADE};" >/dev/null
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME_FRESH};" >/dev/null
docker exec "$CONTAINER" psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME_UPGRADE};" >/dev/null

# Test 1: leere DB → migrate deploy
if run_prisma "$DATABASE_URL_FRESH" "npx prisma migrate deploy" >/dev/null 2>&1; then
  if run_prisma "$DATABASE_URL_FRESH" "npx prisma migrate status" 2>&1 | grep -qi "up to date"; then
    pass "fresh database migrate deploy"
  else
    fail "fresh database migrate deploy (status)"
  fi
else
  fail "fresh database migrate deploy"
fi

# Test 2: db-push DB → baseline + migrate deploy
if run_prisma "$DATABASE_URL_UPGRADE" "npx prisma db push --accept-data-loss" >/dev/null 2>&1; then
  if run_prisma "$DATABASE_URL_UPGRADE" "sh scripts/docker-entrypoint.sh migrate" >/dev/null 2>&1; then
    if run_prisma "$DATABASE_URL_UPGRADE" "npx prisma migrate status" 2>&1 | grep -qi "up to date"; then
      pass "upgrade from db push baseline"
    else
      fail "upgrade from db push baseline (status)"
    fi
  else
    fail "upgrade from db push baseline (entrypoint)"
  fi
else
  fail "upgrade from db push baseline (db push setup)"
fi

echo ""
echo "Ergebnis: $PASS bestanden, $FAIL fehlgeschlagen"
[[ $FAIL -eq 0 ]]
