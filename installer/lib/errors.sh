#!/usr/bin/env bash
# FestSchmiede Installer – verständliche Fehlermeldungen für Admins

# Exit-Codes für Automatisierung
: "${EXIT_OK:=0}"
: "${EXIT_GENERAL:=1}"
: "${EXIT_DOCKER:=10}"
: "${EXIT_BACKUP:=11}"
: "${EXIT_MIGRATION:=12}"
: "${EXIT_HEALTH:=13}"
: "${EXIT_ROLLBACK:=14}"

installer_error_message() {
  local code="$1"
  local detail="${2:-}"

  case "$code" in
    docker_missing)
      echo "Docker ist nicht installiert oder der Daemon läuft nicht."
      echo "→ Starten Sie Docker: sudo systemctl start docker"
      echo "→ Oder installieren Sie Docker über den Assistenten (Schritt Docker)."
      ;;
    docker_pull)
      echo "Neue Container-Images konnten nicht heruntergeladen werden."
      echo "→ Prüfen Sie Internetverbindung und GHCR-Zugang (GITHUB_TOKEN in .env)."
      echo "→ Details im Protokoll: $LOG_FILE"
      [[ -n "$detail" ]] && echo "→ Technisch: $detail"
      ;;
    docker_up)
      echo "Container konnten nicht gestartet werden."
      echo "→ Prüfen Sie: docker compose ps"
      echo "→ Logs: docker compose logs backend --tail 50"
      [[ -n "$detail" ]] && echo "→ Technisch: $detail"
      ;;
    backup_failed)
      echo "Datenbank-Backup fehlgeschlagen — Update wurde abgebrochen."
      echo "→ Läuft der Postgres-Container? docker compose ps"
      echo "→ Manuell testen: ./scripts/backup/postgres-backup.sh"
      [[ -n "$detail" ]] && echo "→ Technisch: $detail"
      ;;
    migration_failed)
      echo "Datenbank-Migration nach dem Update fehlgeschlagen."
      echo "→ Backend-Logs: docker compose logs backend --tail 100"
      echo "→ Rollback wird angeboten (Konfiguration + optional Datenbank)."
      [[ -n "$detail" ]] && echo "→ Technisch: $detail"
      ;;
    health_failed)
      echo "Health-Check nach dem Update fehlgeschlagen."
      echo "→ API prüfen: curl -s http://localhost:3001/api/health"
      echo "→ Container-Status: docker compose ps"
      echo "→ Bei anhaltenden Problemen: Assistent → Reparatur oder Rollback."
      [[ -n "$detail" ]] && echo "→ Technisch: $detail"
      ;;
    rollback_failed)
      echo "Automatischer Rollback fehlgeschlagen."
      echo "→ Manuelle Wiederherstellung: docs/OPERATIONS.md#wiederherstellung-aus-backup"
      [[ -n "$detail" ]] && echo "→ Technisch: $detail"
      ;;
    no_install)
      echo "Keine bestehende Installation gefunden (.env und docker-compose.yml fehlen)."
      echo "→ Führen Sie zuerst ./install.sh ohne --update aus."
      ;;
    *)
      echo "${detail:-Unbekannter Fehler. Siehe Protokoll: $LOG_FILE}"
      ;;
  esac
  return 0
}

installer_fail() {
  local code="$1"
  local detail="${2:-}"
  log_error "[$code] $detail"
  installer_error_message "$code" "$detail" >&2
}
