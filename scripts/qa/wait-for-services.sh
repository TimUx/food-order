#!/usr/bin/env bash
set -euo pipefail

API_URL="${QA_PLATFORM_API_BASE:-http://localhost:3001/api}"
FRONTEND_URL="${QA_FRONTEND_BASE:-http://localhost:5173}"
TIMEOUT="${QA_WAIT_TIMEOUT:-180}"

echo "Warte auf Backend: $API_URL/health"
for ((i=1; i<=TIMEOUT; i++)); do
  if curl -sf "$API_URL/health" >/dev/null; then
    echo "Backend bereit nach ${i}s"
    break
  fi
  if [[ $i -eq $TIMEOUT ]]; then
    echo "Backend nicht erreichbar" >&2
    exit 1
  fi
  sleep 1
done

echo "Warte auf Frontend: $FRONTEND_URL"
for ((i=1; i<=TIMEOUT; i++)); do
  if curl -sf "$FRONTEND_URL" >/dev/null; then
    echo "Frontend bereit nach ${i}s"
    exit 0
  fi
  if [[ $i -eq $TIMEOUT ]]; then
    echo "Frontend nicht erreichbar" >&2
    exit 1
  fi
  sleep 1
done
