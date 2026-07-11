# Changelog

Alle wesentlichen Aenderungen an **FestSchmiede** werden hier dokumentiert.
Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/).

## 2.3.2 - 2026-07-11

### Behoben

- **Bootstrap:** Bei erneutem `curl | bash` auf bestehende Installation werden Plattform-Dateien automatisch aktualisiert, wenn die installierte Installer-Version veraltet ist (verhindert alten Wizard mit „Docker-Netzwerk“ vor Proxy-Abfrage).

### Geändert

- **Dokumentation:** Erklärung zu internem vs. Proxy-Netzwerk und Auto-Update beim Online-Install.

---

## 2.3.1 - 2026-07-11

### Behoben

- **Installer:** „Vorhandenen Proxy verwenden“ und NGINX setzen jetzt das Produktionsprofil — Domain und HTTPS können konfiguriert werden.
- **Installer:** Proxy-Netzwerk-Schritt erscheint nur noch, wenn ein Reverse Proxy gewählt wurde; ohne Proxy lokale Host-Ports und nur internes Docker-Netz.

### Geändert

- **Installer:** HTTPS-Abfrage bei externem Proxy ohne Let's-Encrypt-Pflicht (Zertifikat am Reverse Proxy).
- **Dokumentation:** Wizard-Schritte Reverse Proxy / Proxy-Netzwerk korrigiert.

---

## 2.3.0 - 2026-07-11

### Neu

- **Bestellungen bearbeiten:** Admins und Mitarbeiter können offene Bestellungen (Neu/In Bearbeitung) anpassen — Gerichte hinzufügen, entfernen, Mengen ändern, stornieren.
- **Ausverkauft markieren:** Gerichte als ausverkauft kennzeichnen (Admin, Küche, Kasse); in der Bestellung ausgegraut mit Hinweis.
- **Bestellexport:** Druckansicht und Excel-Export (`.xlsx`, formatiert) aller Bestellungen pro Veranstaltung.
- **Plattform:** Mandanten bearbeiten (Organisation, Kontakt, technische Felder).
- **Installer:** Konfigurierbares Installationsverzeichnis, verbesserte TUI, Docker-Netzwerk-Architektur (intern + Proxy).

### Geändert

- **Dokumentation:** Reduziert auf das Wesentliche (~50 Dateien weniger); README mit Screenshots und Funktionsüberblick erweitert.
- **Developer Guide:** Node 20, `prisma generate` nach Docker-Builds.

### Abhängigkeiten

- Backend: `exceljs` für XLSX-Export.

---

## 2.2.3 - 2026-07-10

### Behoben

- **CI/QA vollständig grün:** Docker-Stack, Migrationen, API-Tests, E2E, Performance-Baseline und Release-Validation.
- **Multi-Tenant CI:** Mandanten-Routing über `default.localhost`, Plattform-Marketing auf `localhost`, API same-origin via Nginx.
- **E2E:** Admin-Drawer-Locators, Nginx `/screenshots`-SPA-Route, lokale Canonical-URLs mit Port.
- **API/Routing:** Resolver-Cache, `platform`-Slug, Supertest-Host-Helper, Tenant-Prisma-Guard, QA-Seed.
- **Lint/TypeScript:** Korrekturen nach v2.2.2-Merge.

---

## 2.2.2 - 2026-07-10

### Neu

- **Tenant Guardrails:** CI blockiert ungescopte `prisma.<tenantModel>`-Zugriffe (ADR 040).
- **Tenant Role Templates:** Vorlagen Küche, Abholung, Kasse, Speisenpflege, Finanzen, Rechtliches (ADR 043).
- **Core Permissions:** `team.manage`, `food.edit`, `orders.kitchen`, `settings.club` u. a.
- **Geführte Betriebsabläufe:** `./install.sh --update`, `--repair`, `--backup`, `--validate` (ADR 044).
- **Restore Dry-Run:** `DRY_RUN=1` für Backup-Integritätsprüfung.

### Geändert

- **Produktionsmigrationen:** `prisma migrate deploy` statt `db push` (ADR 039).
- **Module API v3:** Kanonische Runtime in `platform/` (ADR 041).
- **Volunteer-first Admin:** Dashboard/Navigation fokussiert Alltagsaufgaben (ADR 042).
- Team-UI mit Rollenvorlagen; `auth.ts`/`userService` über Repositories.
- Preview-Module nur mit `SHOW_PREVIEW_MODULES=1`.
- **Performance:** Order-Stats per DB-Aggregation; gebündeltes `findByIds`; Realtime-Polling-Metriken; k6 `dashboard_stats`.
- Wizard Upgrade/Migration nutzen geführte Update-Pipeline; Installer-Fehlermeldungen.
- **Security Hardening:** CORS/Secret-Guards, Helmet-Baseline, Upload Content-Length, Impersonation-Audit (ADR 045).
- **Dokumentation:** Drei Ebenen (Ehrenamt/Admin/Maintainer), README gekürzt, Phase-Reports archiviert, Linkcheck in CI.

### Tests

- E2E `admin-navigation.spec.ts`, `authorization-matrix.test.ts`, Tenant-Guard CI, Installer-Ops-Tests.

---

## 2.2.1 - 2026-07-10

### Neu

- **Online-Installation ohne Git-Clone:** `curl -fsSL .../install.sh | bash` lädt Release-Archiv von GitHub und startet den TUI-Assistenten.
- Bootstrap-Tests (`installer/tests/bootstrap.test.sh`) für Online- und Lokalmodus.

### Behoben

- Tar-Entpacken im Online-Bootstrap: Exit-Code 141 durch `pipefail` und `tar | head` behoben.

---

## 2.2.0 - 2026-07-10

### Neu

- **Interaktiver TUI-Installations-Assistent** (`./install.sh`): 13-stufiger Wizard mit dialog/gum, Systemanalyse, Docker-Erkennung, Reverse-Proxy-Erkennung, automatische `.env`- und Compose-Generierung.
- **Rollback & Protokollierung:** Pre-Install-Backups, Fehlerbehandlung mit Retry/Rollback, Installationslogs unter `installer/logs/`.
- **ADRs 034–038:** Interactive Installer, Installation Wizard, Environment Detection, Configuration Generation, Rollback Strategy.

### Geändert

- README und neue Installationsanleitung (`docs/INSTALLATION.md`) mit Schnellstart über `./install.sh`.
- Version 2.2.0 in Backend, Frontend und Core.

---

## 2.1.0 - 2026-07-10

### Neu

- **Zentraler MailService:** SMTP-Konfiguration ausschließlich in der Plattformverwaltung (`/platform/email`); Verbindungstest, Testmail, Mail-Queue-Status.
- **Initial-Setup-Assistent:** 7-stufiger Einrichtungsassistent für neue Mandanten mit optionaler erster Veranstaltung.
- **Passwortlose Authentifizierung:** Magic Link und Login-Code; vier konfigurierbare Auth-Modi; Rate Limiting und Audit Logging.
- **Mail-Templates:** Login-Code, Magic-Link, Initial-Setup, Testmail.
- **ADRs 031–033:** Zentraler MailService, Setup Wizard, Passwortlose Authentifizierung.

### Geaendert

- Mandanten besitzen keine eigenen SMTP-Einstellungen mehr (nur Branding-Overrides).
- `User.passwordHash` ist optional (passwortlose Konten).
- Login-Seite zeigt je nach Plattformkonfiguration nur erlaubte Anmeldeverfahren.

### Migration

- Bestehende Mandanten werden bei Update als „eingerichtet“ markiert.
- Auth-Modus standardmäßig `password_or_magic` für Abwärtskompatibilität.

---

## 2.0.1 - 2026-07-10

### Geaendert (Rebranding)

- Produktname von **FestManager** auf **FestSchmiede** vereinheitlicht (UI, Dokumentation, Benachrichtigungen, OpenAPI, Docker-Images, Paketnamen).
- Repository: `TimUx/FestSchmiede`, Container-Images: `ghcr.io/timux/festschmiede/*`.
- Passend zur bestehenden App **KochSchmiede** in der Produktfamilie „Schmiede“.

### Hinweis

- Keine funktionalen Breaking Changes; APIs, Datenbankschema und Konfigurationspfade bleiben kompatibel.
- Nach dem Update ggf. `GHCR_IMAGE_PREFIX=ghcr.io/timux/festschmiede` in der `.env` setzen.

---


### Neu — Multi-Tenant-Plattform

- **Mandantenfähige Architektur:** Shared Database mit `tenantId`, `TenantContext` und `PlatformContext` (ADR-020–027).
- **Plattformadministration:** Dashboard, Mandantenverwaltung, Monitoring, globale Einstellungen unter `/platform`.
- **Tenant-Routing:** Subdomain- und Pfad-basierte Auflösung via `TenantResolver`; mandantenspezifisches Branding im Frontend.
- **Mandantenfähige Module:** Payment, Notifications, Legal, Printer mit tenant-scoped Settings und Daten.
- **Mandanten-Benachrichtigungen:** Eigener SMTP pro Mandant, Branding in Templates, Delivery-Logging (ADR-028).
- **Deployment:** Docker Compose mit Traefik, Wildcard-TLS, mandantenfähiger nginx-Konfiguration.

### Verbessert

- **Sicherheit:** Tenant-Isolation in APIs, JWT, Uploads, WebSockets; Host-Validation; Rate Limits (ADR-029).
- **Performance:** DB-Indizes, Slow-Request-Logging, k6-Lasttests bis 250 VUs, Frontend Code Splitting (ADR-030).
- **Monitoring:** Erweiterte `/api/health`, Platform-Monitoring mit System- und Socket-Metriken.
- **OpenAPI:** Version 2.0.0, mandantenfähige API-Struktur dokumentiert.

### Geaendert (Breaking)

| Alt (v1.x) | Neu (v2.0) |
|------------|------------|
| Single-Tenant | Multi-Tenant — Mandant aus Host/Pfad erforderlich |
| Keine Plattform-Admin-UI | `/platform` für Plattformadministration |
| Globale Settings | Plattform- vs. Mandanteneinstellungen getrennt |
| `CORE_VERSION` 1.5.0 | `CORE_VERSION` 2.0.0 |

### Migration

- Bestehende Single-Tenant-Installationen: Daten werden beim Start in den Default-Mandanten migriert (`migrateTenantSchema`).
- Siehe [Architektur-ADRs](docs/architecture/README.md).

### Dokumentation

- README, ROADMAP, SECURITY, Deployment-, Performance- und Notification-Guides aktualisiert.
- 10 Phase-Abschlussberichte (Phase 0–10) und ADRs 020–030.

---

## 1.5.0 - 2026-07-09

### Geaendert (Rebranding)

- Produktname von **Vereinsbestellung** auf **FestManager** vereinheitlicht (UI, Dokumentation, Benachrichtigungen, OpenAPI, Docker-Images, Paketnamen).
- Repository- und Image-Pfade: `FestManager` / `ghcr.io/timux/festmanager`.
- Terminologie: **Veranstalter** statt „Verein“, wo der Betreiber einer Veranstaltung gemeint ist (Admin-Bereich, Einstellungen, E-Mails).
- Bereich **Verein & Kontakt** heisst in der Oberflaeche **Veranstalter** (`/admin/verein` unveraendert).

### Dokumentation

- README, Guides, ROADMAP, CHANGELOG und Release Notes auf FestManager und erweiterte Zielgruppe aktualisiert.

### Hinweis

- Keine Breaking Changes: APIs, Datenbankschema, Berechtigungs-Keys und Konfigurationspfade bleiben kompatibel.
- Beispieldaten mit Vereinsnamen (z. B. Feuerwehr Musterstadt) und interne technische Bezeichner (`core.club`, `verein_token`) bleiben unveraendert.

---

## 1.4.0 - 2026-07-09

### Neu

- Offizielles Modul `legal` fuer Impressum, Datenschutz, AGB und Widerrufsbelehrung hinzugefuegt.
- Oeffentliche Rechtsseiten mit konfigurierbaren Slugs und dynamischem Footer auf der Bestellseite eingefuehrt.
- Rechtslinks automatisch in Notification-E-Mails integriert, wenn veroeffentlichte Seiten vorhanden sind.

### Verbessert

- Rechtstexte werden serverseitig sanitizt, bevor sie gespeichert oder ausgerendert werden.
- Vereins-Kontaktdaten koennen optional automatisch im Impressum ergaenzt werden.

### Behoben

- Versehentliche Anzeige leerer oder unveroeffentlichter Rechtsseiten wird verhindert.

### Dokumentation

- README, Admin Guide, User Guide, Developer Guide und Architektur-ADRs fuer das Legal-Modul aktualisiert.

---

## 1.3.0 - 2026-07-08

*Die 1.3-Reihe wurde bis **1.3.16** (2026-07-09) mit UX-, Sicherheits- und CI-Verbesserungen fortgefuehrt.*

### Neu

- **Plattformschicht:** SettingsService, Permission-System, AdminUiService, EventBus, HealthService, AuditService, ModuleMigrationService.
- **Metadata-first Admin-UI:** dynamische Navigation und Seiten (`GET /api/admin/ui`), generische Settings-Formulare.
- **Payment-Modul (produktionsreif):** Smart Payment (Bar/Online, QR, Live-Status), Payment-Admin unter `/admin/payment` (Dashboard, Provider, Zahlungsarten, Zahlungen, Refunds, Logs, Webhooks, Health, Statistiken).
- **Notifications-Modul:** SMTP, ntfy, Discord, Slack, Microsoft Teams; Konfiguration unter `/admin/settings/module.notifications`.
- **Printer-Modul:** Grundgeruest fuer Bondruck (Adapter, Hooks, PDF).
- **Einrichtungsassistent** (`/admin/einrichtung`) fuer die Erstkonfiguration.
- **Zahlungs-Presets** (nur Bar / Bar+Karte / Online) und **Rollen-Presets** in der Team-Verwaltung.
- **RealtimeService** mit WebSocket und intelligentem Polling-Fallback.

### Verbessert

- Admin-Bereich vereinfacht: **Funktionen** statt Modul-Jargon; nur produktionsreife Module sichtbar (`productionReady`).
- Stripe-Haertung: Webhook-Idempotenz, granulare Payment-Berechtigungen, POS-/Kassen-QR.
- Mitarbeiter-Bestelluebersicht zeigt E-Mail und Telefon unter dem Kundennamen.
- **Sicherheit:** Lookup-Token fuer oeffentlichen Bestellstatus; Session-Widerruf bei Logout und deaktivierten Nutzern; gehaertete Bild-Upload-Pipeline (Sharp).
- Ausgehender Nachrichtenversand vollstaendig ueber das Benachrichtigungsmodul; zentrale E-Mail-Templates (`templates/de.ts`).
- Umfangreiche **QA/CI-Pipeline** (GitHub Actions, Vitest, Playwright, Modul-Szenarien, Nightly, Release Validation).

### Geaendert (Breaking)

| Alt | Neu |
|-----|-----|
| `/admin/module/payment` | `/admin/payment` |
| `/admin/email` | `/admin/settings/module.notifications` |
| `PAYMENT_ENCRYPTION_KEY` | `APP_ENCRYPTION_KEY` |
| Hardcodierte Settings-Seiten | Generische Settings |

### Dokumentation

- ADRs 001–011, Migrationsplan, Modul-Architektur-Handbuch, Operations- und Security-Doku.
- Screenshots fuer Payment-Admin und Benachrichtigungen.

---

## 1.2.0 - 2026-07-08

### Neu

- **Modulsystem** mit vollstaendigem Lifecycle (installieren, aktivieren, deaktivieren, Health Check).
- Admin-Oberflaeche **Modulverwaltung** (`/admin/module`); Module werden mit dem Docker-Image ausgeliefert.
- **Payment-Modul** als erstes offizielles Modul: Stripe (Checkout, Webhooks, Refunds, Sandbox), PayableResource-Abstraktion, verschluesselte API-Schluessel.
- Platzhalter-Anbieter: PayPal, VR Payment, S-Payment, PAYONE, SumUp.
- Neun Stub-Module vorbereitet (u. a. Inventory, Printer, Voucher, Notifications).

### Verbessert

- Optionale Erweiterungen ohne Aenderungen am Core aktivierbar.

### Dokumentation

- Neues Modul-Architektur-Handbuch; Admin-, Developer- und User-Guide aktualisiert.
- Screenshots: Modulverwaltung, Payment-Einstellungen.

> **Hinweis:** Ohne aktiviertes Payment-Modul verhaelt sich die Plattform wie zuvor (Barzahlung an der Kasse).

---

## 1.1.0 - 2026-07-08

### Neu

- **Bestell-Einstellungen:** konfigurierbare Pflichtfelder (Vorname, Nachname, E-Mail, Telefon) und Stornierungsfrist in Stunden.
- **Kunden-Stornierung** auf der Statusseite mit Nachnamen-Bestaetigung.
- **E-Mail-Versand im Admin:** SMTP-Konfiguration unter `/admin/email`, optionaler Freitext in Bestell- und Stornierungsmails.

### Verbessert

- Bestaetigungs- und Stornierungsmails mit Vereinsdaten, Bestelldetails, rechtlichen Hinweisen und Status-Link.
- Schema-Erweiterung in `ClubSettings` fuer Pflichtfelder, SMTP und Freitext.

### Geaendert

- SMTP-Einstellungen wandern von Umgebungsvariablen in den Admin-Bereich (einmalige Nachkonfiguration nach Update noetig).

### Dokumentation

- Guides und Screenshots aktualisiert.

---

## 1.0.0 - 2026-07-08

Erste stabile Version der FestSchmiede-Plattform.

### Neu

- **Oeffentlicher Bereich:** touch-optimierte Bestellseite, Vorausbestellungen, Kundenstatus per WebSocket, Kontaktseite, Abholboard, Bot-Schutz (Honeypot, Zeitpruefung, optional Turnstile).
- **Mitarbeiterbereich:** Dashboard mit Live-Statistiken, Kuechenansicht, Abholung, Bestellung vor Ort, Bestelluebersicht.
- **Administration:** Verein & Kontakt, Benutzerverwaltung, Veranstaltungs- und Speisenverwaltung mit Bild-Upload.
- **Betrieb:** Docker Compose, PostgreSQL, PWA, automatischer Build der Images in `ghcr.io/timux/festschmiede/`.

### Dokumentation

- Admin-, User- und Developer-Guide; Schnellstart und Standard-Zugangsdaten nach Seed (`admin@verein.local`).

### Stack

React/TypeScript · MUI · Node/Express · Prisma · PostgreSQL · Socket.IO · Docker
