#!/usr/bin/env bash
# Restore dry-run test
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RESTORE="${ROOT}/scripts/backup/postgres-restore.sh"
TMP=$(mktemp -d)

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

# Gültiges gzip (>100 Bytes Minimum im Restore-Skript)
{
  echo '-- FestSchmiede restore dry-run fixture'
  for i in $(seq 1 40); do echo "INSERT INTO mock VALUES ($i);"; done
} | gzip >"$TMP/valid.sql.gz"

echo "=== Restore Dry-Run ==="
if DRY_RUN=1 bash "$RESTORE" "$TMP/valid.sql.gz" | grep -q 'DRY_RUN OK'; then
  echo "  ✓ valid backup dry-run"
else
  echo "  ✗ valid backup dry-run"
  exit 1
fi

echo 'not gzip' >"$TMP/invalid.sql.gz"
if DRY_RUN=1 bash "$RESTORE" "$TMP/invalid.sql.gz" 2>/dev/null; then
  echo "  ✗ invalid should fail"
  exit 1
else
  echo "  ✓ invalid backup rejected"
fi

if DRY_RUN=1 bash "$RESTORE" "$TMP/missing.sql.gz" 2>/dev/null; then
  echo "  ✗ missing file should fail"
  exit 1
else
  echo "  ✓ missing file rejected"
fi

echo "OK"
