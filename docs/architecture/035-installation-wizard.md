# ADR 035: Installation Wizard

## Status

Accepted (v2.2.0)

## Entscheidung

Der Wizard in `installer/lib/wizard.sh` implementiert konfigurierbare Schritte mit persistentem State in `.installer-state/install.state`.

Schritte: Willkommen → Installationspfad → Systemanalyse → Modus → Docker → Reverse Proxy → Proxy-Netzwerk (optional) → Domain → Plattform → DB → Redis → Mail → Sicherheit → Zusammenfassung.

Navigation über `tui_nav()` mit Zurück/Weiter/Abbrechen.

## Konsequenzen

- Wizard-State überlebt Unterbrechungen
- Schritte sind modular erweiterbar
