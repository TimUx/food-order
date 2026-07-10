# ADR 042: Volunteer-first Administration

**Status:** Accepted  
**Datum:** 2026-07-10  
**Kontext:** Prompt 4 — Admin-UX vereinfachen

## Kontext

FestSchmiede wird von Vereinshelfern betrieben, nicht von DevOps-Teams. Die bisherige Administration mischte fachliche Aufgaben (Veranstaltung planen, Team pflegen) mit technischen Konzepten (Modul-Lifecycle, Versionen, Health Checks, Channel-Integrationen).

## Entscheidung

Wir führen ein **volunteer-first** Admin-Erlebnis ein:

1. **Fachliche Seiten vor dynamischem Settings-Katalog** — Navigation und Dashboard-Kacheln zeigen nur Alltagsaufgaben (Veranstaltungen, Speisen, Team, Funktionen, Veranstalter, Bestellung, Benachrichtigungen).
2. **Einstellungen mit klaren Labels** — Unter „Einstellungen“ nur `Veranstalter`, `Bestellung`, `Benachrichtigungen` (Namespaces `core.club`, `core.order`, `module.notifications`).
3. **Technik unter „Erweitert“** — Version, Fehler, Funktionsstatus und Echtzeit-Verbindung sind standardmäßig ausgeblendet und in ausklappbaren Bereichen „Erweitert“ erreichbar.
4. **Settings-Gruppen mit `advanced: true`** — Kanal-spezifische Benachrichtigungsoptionen (ntfy, Discord, Slack, Teams) erscheinen erst nach Aufklappen von „Erweitert“.
5. **API-Kompatibilität** — `AdminUiCatalog.health` bleibt leer; technische Health-Daten liegen in `technicalDetails.health` für spätere Operator-Tools.

## Konsequenzen

### Positiv

- Kernsetup ohne technische Begriffe möglich.
- Bestehende Settings-Schemas und Modul-Metadaten bleiben erhalten; nur die Präsentation ändert sich.
- E2E-Tests sichern die volunteer-first Navigation ab.

### Negativ / Trade-offs

- Operatoren müssen „Erweitert“ öffnen für Diagnose (Health, Version).
- Dashboard zeigt weniger Kacheln (keine Payment-/Developer-Seiten als Kachel).

## Betroffene Komponenten

| Bereich | Änderung |
|---------|----------|
| `AdminUiService` | Volunteer-Dashboard-Filter, `technicalDetails.health` |
| `coreAdminMetadata` | `CORE_VOLUNTEER_*` Konstanten |
| `FeatureModulesPage` | Keine Version-Spalte; Erweitert-Akkordeon |
| `AdminDashboardPage` | Realtime/Health unter Erweitert |
| `DynamicSettingsForm` | `advanced`-Gruppen unter Erweitert |
| `notifications/module.json` | `advanced: true` für Integrations-Gruppen |

## Akzeptanzkriterien

- [ ] Admin kann Veranstalter, Bestellung und Benachrichtigungen über Einstellungen finden.
- [ ] Funktionen-Seite zeigt An/Aus ohne Version-Spalte.
- [ ] Technische Details nur nach bewusstem Aufklappen von „Erweitert“.
