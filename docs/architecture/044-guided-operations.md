# ADR 044: Guided Operations

**Status:** Accepted  
**Datum:** 2026-07-10  
**Kontext:** Prompt 7 — Installer/Update härten

## Kontext

Vereins-Admins sind keine Shell-Experten. Updates wurden in `OPERATIONS.md` als manuelle Docker-Befehle dokumentiert, während der Installer-Modus „Upgrade“ dieselbe Pipeline wie Neuinstallation nutzte — ohne Datenbank-Backup, ohne Rollback bei Health-Fehlern.

## Entscheidung

Der Installer wird zum **Betriebsassistenten** mit geführten Abläufen:

| Befehl | Ablauf |
|--------|--------|
| `./install.sh --update` | Config-Backup → DB-Backup → `compose pull` → `compose up` → Migration → Health → Rollback |
| `./install.sh --repair` | Neustart + Health |
| `./install.sh --backup` | Nur `postgres-backup.sh` |
| `./install.sh --validate` | Voraussetzungen prüfen (ohne Änderungen) |

Wizard-Modi **Upgrade** und **Migration** nutzen dieselbe `run_guided_update()`-Pipeline.

### Rollback

1. Konfiguration aus `.installer-state/backups/` wiederherstellen
2. Optional Datenbank aus `last_db_backup` (bei Update-Fehler)
3. `compose up` mit wiederhergestellter Config

### Sicherheit

- Secrets nicht mehr in `install.state` (nur `.env` chmod 600 + `credentials.txt`)
- Klare Fehlermeldungen (`installer/lib/errors.sh`) statt roher Docker-Ausgabe

## Konsequenzen

- Admins brauchen für Updates keine manuellen `docker compose`-Befehle
- CI kann `--validate` und Restore-`DRY_RUN=1` ausführen
- Vollständiger Image-Rollback bleibt zukünftige Erweiterung (siehe ADR 038)

## Akzeptanz

- `./install.sh --validate` exit 0 bei laufender Installation
- `./install.sh --update` führt Backup vor Pull aus
- Fehlgeschlagenes Update bietet Rollback ohne manuelle Docker-Kenntnisse
