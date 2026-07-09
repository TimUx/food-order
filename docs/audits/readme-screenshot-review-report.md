# README Screenshot Review – Änderungsbericht

**Datum:** 9. Juli 2026  
**Scope:** Alle Screenshots in `docs/screenshots/` und zugehörige README-Abschnitte

## Zusammenfassung

Die README-Screenshots wurden vollständig neu erzeugt und an den aktuellen UI-Stand angepasst. Einheitliche Beispieldaten (*Feuerwehr Musterstadt*, *Sommerfest 2026*, Bratwurst/Pommes/Steak/Cola/Apfelwein) werden durchgängig verwendet. Die Pipeline ist in `scripts/capture-screenshots.ts` dokumentiert und reproduzierbar.

## Ersetzte / korrigierte Screenshots

| Datei | Problem (vorher) | Lösung (nachher) |
|-------|------------------|------------------|
| `13-vereinseinstellungen.png` | Leere Formularansicht | Vollständig ausgefüllte Vereinseinstellungen (Feuerwehr Musterstadt) |
| `18-bestell-einstellungen.png` | Leere Formularansicht | Pflichtfelder und Stornierungsfrist (24 h) sichtbar konfiguriert |
| `21-payment-admin.png` | Bestellformular statt Payment-Admin | Payment-Dashboard Tab „Übersicht“ mit KPIs (Zahlungen heute, Umsatz, Health) |
| `22-payment-einstellungen.png` | Bestellformular statt Einstellungen | Payment-Tab „Einstellungen“ mit Stripe-Konfiguration (Sandbox, API-Schlüssel) |
| `16-admin-uebersicht.png` | Veraltete Navigation („Benutzer“, „Module“, „Modul-Gesundheit“) | Aktuelle Admin-Übersicht mit Team, Funktionen, Echtzeit-Verbindung, Funktionsstatus |
| `17-benutzerverwaltung.png` | Bezeichnung „Benutzer“ | Team-Verwaltung mit realistischen Benutzerkonten |
| `20-modulverwaltung.png` | „Modulverwaltung“ | Funktionen-Seite (Zahlung, Benachrichtigungen, Bondruck) |

## Gesamtreview (alle 22 Screenshots)

Alle Screenshots wurden am **09.07.2026** mit **1920×1080**, **Light Theme** und identischen Mock-Daten neu generiert:

- `01-bestellseite-*` (Monitor, iPhone, iPad) – Sommerfest 2026, Speisekarte mit Bratwurst/Pommes/Steak
- `02`–`04` – Kundenstatus, Status-Abfrage, Abholboard
- `05`–`10` – Mitarbeiterbereich (Login, Dashboard, Küche, Abholung, Bestellung, Bestellungen)
- `11`–`15` – Admin (Speisen, Veranstaltungen, Verein, Kontakt, Login)
- `16`–`22` – Admin-Übersicht, Team, Bestell-Einstellungen, Benachrichtigungen, Funktionen, Payment

**Konsistenz:** Vereinsname, Veranstaltung, Speisekarte und Farbgebung stimmen überein.

## Angepasste README-Bereiche

- Screenshot-Tabelle: Spaltenüberschriften (Team, Funktionen, Payment-Übersicht)
- Modul-Tabelle: Bondruck ergänzt
- Routen: `/admin/benutzer` → Team, `/admin/module` → Funktionen
- Abschnitt „Screenshots aktualisieren“: Umgebungsvariablen `START_FROM`, `SKIP_DEVICES`

## Technische Änderungen

### `scripts/capture-screenshots.ts`

- Mock-Daten auf Feuerwehr Musterstadt / Sommerfest 2026 umgestellt
- Admin-UI-Metadaten (Navigation, Dashboard-Kacheln, Health) aktualisiert
- Payment-URLs: `21` → `/admin/payment?tab=overview`, `22` → `?tab=settings`
- Realtime-API-Mocks, Auth-Refresh, Payment-Admin-APIs ergänzt
- Robuste Wartebedingungen für Admin-Shell und Seiteninhalt
- `START_FROM` / `SKIP_DEVICES` für partielle Neugenerierung

### Bugfix: `RealtimeService.getDiagnostics()`

Die Admin-Übersicht stürzte mit React-Fehler #185 ab, weil `getDiagnostics()` bei jedem Aufruf ein neues Objekt zurückgab und `useSyncExternalStore` in eine Endlosschleife geriet. Das stabile Snapshot-Objekt wurde repariert – notwendig für korrekte Screenshots der Admin-Übersicht.

## Reproduzierbare Erstellung

```bash
cd frontend && npm run build
cd .. && npm install && npx playwright install chromium
npm run screenshots
```

Per Docker (empfohlen bei Berechtigungsproblemen mit `node_modules`):

```bash
docker run --rm -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.52.0-jammy \
  bash -c "apt-get update -qq && apt-get install -y -qq python3-pil \
    && cd frontend && npm install && npm run build \
    && cd .. && npm install && npm run screenshots"
```

Einzelne Screenshots ab Nr. 16:

```bash
START_FROM=16-admin-uebersicht SKIP_DEVICES=1 npm run screenshots
```

## Abschluss-Checkliste

- [x] Alle Screenshots aktuell
- [x] Keine leeren Ansichten (Verein, Bestell-Einstellungen)
- [x] Keine falschen Inhalte (Payment zeigt Admin, nicht Bestellformular)
- [x] Keine veralteten Bezeichnungen (Team, Funktionen, Funktionsstatus)
- [x] Einheitliches Erscheinungsbild und Beispieldaten
- [x] README entspricht dem aktuellen Entwicklungsstand
- [x] Wiederholbare Screenshot-Pipeline dokumentiert
