#!/usr/bin/env bash
# Migriert flache Upload-Dateien nach uploads/{tenantId}/ (Phase 6).
set -euo pipefail

UPLOADS_DIR="${UPLOADS_DIR:-./uploads}"
TENANT_ID="${1:-default}"

if [[ ! -d "$UPLOADS_DIR" ]]; then
  echo "Upload-Verzeichnis nicht gefunden: $UPLOADS_DIR"
  exit 0
fi

TARGET="${UPLOADS_DIR}/${TENANT_ID}"
mkdir -p "$TARGET"

count=0
for file in "$UPLOADS_DIR"/*; do
  [[ -f "$file" ]] || continue
  base=$(basename "$file")
  if [[ "$base" == "$TENANT_ID" ]]; then continue; fi
  mv "$file" "$TARGET/"
  count=$((count + 1))
done

echo "Migration abgeschlossen: $count Datei(en) nach $TARGET verschoben."
