# Entwicklerhandbuch (Developer Guide)

Technische Dokumentation für Entwickler, die an der FestSchmiede-Plattform mitarbeiten oder sie erweitern.

> **Version 2.0:** Multi-Tenant-Unterstützung wird mit v2.0 eingeführt. Phase 0 definiert die Architektur (ADRs 020–027). Module und Services müssen künftig ausschließlich über `TenantContext` arbeiten – niemals Hostname, URL oder `tenant_id`-Parameter selbst auswerten. Details: [Architektur-Dokumentation](architecture/README.md).

## Inhaltsverzeichnis

1. [Architekturübersicht](#architekturübersicht)
2. [Multi-Tenant (v2.0)](#multi-tenant-v20)
3. [Projektstruktur](#projektstruktur)
4. [Lokale Entwicklung](#lokale-entwicklung)
5. [Datenbank & Prisma](#datenbank--prisma)
6. [API-Design](#api-design)
7. [Realtime (Socket.IO)](#realtime-socketio)
8. [Vorausbestellungen](#vorausbestellungen)
9. [Authentifizierung](#authentifizierung)
10. [Tests](#tests)
11. [Deployment](#deployment)
12. [Erweiterungspunkte](#erweiterungspunkte)

---

## Architekturübersicht

```
┌─────────────┐     REST/WS      ┌─────────────┐     Prisma     ┌────────────┐
│   Frontend  │ ◄──────────────► │   Backend   │ ◄────────────► │ PostgreSQL │
│ React + MUI │                  │ Express+TS  │                │            │
└─────────────┘                  └─────────────┘                └────────────┘
       │                                │
       └──────── Socket.IO ─────────────┘
```

### Multi-Tenant (v2.0)

Ab Version 2.0 arbeitet die Plattform mandantenfähig. Kernbausteine:

| Baustein | Verantwortung |
|----------|---------------|
| `TenantContext` | Aktueller Mandant pro Request (serverseitig) |
| `PlatformContext` | Plattformweite Konfiguration |
| `TenantResolver` | Einzige Stelle für Host-/URL-Auflösung |
| `TenantProvider` | React-Provider (ersetzt `ClubContext`) |
| `TenantSettingsService` | Mandantenspezifische Einstellungen (`tenant.order`, `tenant.organization`, `tenant.module.*`) |
| `PlatformSettingsService` | Plattformweite Einstellungen (`platform.*`) |

**Verbindliche Regeln für Entwickler:**

- Kein `tenant_id` in API-Requests (weder Query, Body noch Path)
- Kein Hostname-/URL-Parsing in Modulen oder React-Komponenten
- Alle Datenbankzugriffe mandantenbezogener Tabellen filtern über `tenant_id` aus `TenantContext`
- UI-Begriff bleibt **Veranstalter**; intern **Mandant**

ADRs: [architecture/README.md](architecture/README.md) · Multi-Tenant: [020–027](architecture/README.md) · Frontend: [ADR-023](architecture/023-tenant-routing.md) · Deployment: [INSTALLATION.md](INSTALLATION.md#produktions-deployment)

### Plattform-API (Phase 3)

| Endpoint | Beschreibung |
|----------|--------------|
| `POST /api/platform/auth/login` | Plattform-Login |
| `GET /api/platform/dashboard` | Plattform-Dashboard |
| `GET/POST/PUT/DELETE /api/platform/tenants` | Mandantenverwaltung |
| `POST /api/platform/tenants/:id/impersonate` | Mandanten-Impersonation |
| `GET/PUT /api/platform/settings` | Plattformsettings |
| `GET /api/platform/applications` | Mandantenbewerbungen auflisten |
| `POST /api/platform/applications/:id/approve` | Bewerbung genehmigen (+ optional Mandant anlegen) |
| `GET/PUT /api/platform/legal-pages/:pageType` | Rechtliche Plattformseiten verwalten |

Öffentliche Homepage-APIs (ohne Mandanten-Kontext):

| Endpoint | Beschreibung |
|----------|--------------|
| `GET /api/public/platform` | Plattforminfo inkl. Kontakt, `registrationEnabled` |
| `GET /api/public/platform/legal-links` | Veröffentlichte Rechtslinks |
| `GET /api/public/platform/legal/:slug` | Rechtsseiten-Inhalt |
| `POST /api/public/tenant-applications` | Mandantenbewerbung einreichen |
| `GET /api/platform/domains` | Domain-Konfiguration (Anzeige) |

### Domain-Konfiguration (kanonische Architektur)

Zentrale Verwaltung: `backend/src/platform/PlatformDomainService.ts` · Anzeige in der Plattformverwaltung unter **Domain & Routing**.

| ENV | Beschreibung |
|-----|--------------|
| `PLATFORM_DOMAIN` | Basis-Domain (z. B. `example.org`) |
| `WWW_SUBDOMAIN` | WWW-Subdomain (Default: `www`) |
| `APP_SUBDOMAIN` | APP-Subdomain (Default: `app`) |
| `API_SUBDOMAIN` | API-Subdomain (Default: `api`) |
| `DOCS_SUBDOMAIN` / `STATUS_SUBDOMAIN` | Optionale Dienste |
| `PLATFORM_RESERVED_SUBDOMAINS` | Zusätzlich reservierte Subdomains (kommagetrennt) |
| `PLATFORM_WWW_DOMAIN` / `PLATFORM_APP_DOMAIN` | Optionale vollständige Host-Overrides |
| `COOKIE_DOMAIN` / `SESSION_DOMAIN` | Cookie-/Session-Domain |
| `ALLOWED_ORIGINS` / `PLATFORM_ALLOWED_ORIGINS` | CORS |

Linkgenerierung (QR, E-Mails, Routing, SEO) nutzt ausschließlich `PlatformDomainService`. Siehe [ADR-023](architecture/023-tenant-routing.md).

Plattform-APIs erfordern JWT mit `scope: "platform"`. Mandanten-APIs lehnen Plattform-Tokens ab.

### Repository-Filter (Phase 2)

Mandantenbezogene Repositories nutzen `backend/src/platform/tenant/tenantScope.ts`:

```typescript
import { tenantWhere, withTenantId, requireTenantId } from '../platform/tenant/tenantScope';

// Lesen – tenantId wird automatisch ergänzt
prisma.user.findMany({ where: tenantWhere({ active: true }) });

// Schreiben
prisma.event.create({ data: withTenantId({ name: 'Sommerfest', date: new Date() }) });
```

### Tenant-Regeln (CI-Guard)

**Nie** direkt `prisma.order`, `prisma.user`, `prisma.event`, … in Services oder Controllern – nutze die Repositories unter `src/repositories/` bzw. Modul-Repositories.

```bash
# CI prüft tenant-scoped Prisma-Zugriffe
npm run qa:tenant-guard
```

| Erlaubt | Beispiel |
|---------|----------|
| Repository-Schicht | `orderRepository.findById(id)` |
| Platform-Admin | `prisma.user.count({ where: { tenantId } })` in `PlatformTenantAdminService` |
| Scoped Service (Allowlist) | `realtimeSyncService` mit `tenantWhere()` |
| Entwicklung | `npx prisma db push` (nicht Produktion) |

Neue Allowlist-Einträge nur mit Begründung in `scripts/qa/tenant-prisma-policy.ts` und ADR 040. Ungescopte Queries brechen CI – siehe `scripts/qa/fixtures/tenant-guard-violation.ts` (negative Fixture).

Beim App-Start: `ensureDefaultTenant()` → `migrateMultiTenantSchema()` (idempotent, Marker in `platform_settings`).


### Implementierte APIs (Phase 1)

| Endpoint | Beschreibung |
|----------|--------------|
| `GET /api/public/tenant` | Öffentliche Mandantendaten (host-aufgelöst) |
| `GET /api/public/platform` | Plattforminformationen (Kontakt, Bewerbungen, SEO) |
| `POST /api/public/tenant-applications` | Mandantenbewerbung |

### Backend-Nutzung in Modulen

```typescript
// Über FeatureContext (bevorzugt in Modulen)
const tenantId = context.getTenantId();

// Über DI (Services, Middleware)
const tenantContext = platformContainer.get<TenantContext>(PLATFORM_TOKENS.TenantContext);
const id = tenantContext.require().id;
```

### Schichten im Backend

| Schicht | Verzeichnis | Aufgabe |
|---------|-------------|---------|
| Routes | `src/routes/` | HTTP-Routing, Middleware-Kette |
| Controllers | `src/controllers/` | Request/Response-Handling |
| Services | `src/services/` | Geschäftslogik |
| Repositories | `src/repositories/` | Datenzugriff (Prisma) |
| Middleware | `src/middleware/` | Auth, Validierung, Fehler |
| Validation | `src/validation/` | Zod-Schemas |

---

## Projektstruktur

```
FestSchmiede/
├── backend/
│   ├── modules/          # Offizielle Feature-Module (payment, inventory, …)
│   ├── plugins/          # Community-Plugins (Zukunft)
│   ├── prisma/           # Schema, Migrationen, Seed
│   └── src/
│       ├── module-system/    # ModuleManager, Discovery, Extension Points
│       └── core/payable/     # PayableResource-Adapter (z. B. Bestellungen)
├── frontend/
│   └── src/
│       ├── components/   # Wiederverwendbare UI
│       ├── contexts/     # Auth, Theme
│       ├── module-system/    # useModules, Modul-Menüs
│       ├── pages/        # Routen/Seiten
│       ├── services/     # API-Client, Socket
│       └── types/
├── docs/
│   ├── screenshots/      # UI-Screenshots
│   ├── DEVELOPER_GUIDE.md
│   ├── ADMIN_GUIDE.md
│   ├── architecture/     # ADRs
│   └── USER_GUIDE.md
├── scripts/
│   └── capture-screenshots.ts
└── docker-compose.yml
```

---

## Lokale Entwicklung

### Voraussetzungen

- **Node.js 20 LTS** (empfohlen) oder 22+ — Node 18 wird nicht unterstützt (Vitest/Vite ESM-Fehler)
- PostgreSQL 16+
- npm (optional: [nvm](https://github.com/nvm-sh/nvm) für mehrere Node-Versionen)

```bash
# Beispiel mit nvm
nvm install 20
nvm use 20
node --version   # v20.x
```

**Prisma Client lokal erzeugen:** Wurde der Client im Docker-Container (Alpine/`linux-musl`) generiert, schlägt die lokale Entwicklung auf Debian/Ubuntu fehl. Einmalig nach `npm install`:

```bash
cd backend
npm run prisma:generate
```

Symptom: `Prisma Client could not locate the Query Engine for runtime "debian-openssl-3.0.x"`.

### Backend starten

```bash
cd backend
cp ../.env.example .env
# DATABASE_URL in .env anpassen
npm install
npm run prisma:generate
npx prisma db push
npm run seed
npm run dev
```

Backend läuft auf `http://localhost:3001`.

### Frontend starten

```bash
cd frontend
npm install
npm run dev
```

Frontend läuft auf `http://localhost:5173` mit Proxy zu `/api` und `/socket.io`.

**Multi-Tenant-Routing:** Das Frontend wertet Hostname/URL nicht selbst aus — Mandantenerkennung über `GET /api/public/routing-config`. Hooks: `useRouting()`, `useTenant()`, `usePlatform()`. Tokens mandantenbezogen in `localStorage`. Details: [ADR-023](architecture/023-tenant-routing.md).

### Mit Docker

```bash
cp .env.example .env
docker compose pull
docker compose up -d
docker compose exec backend npm run seed
```

---

## Datenbank & Prisma

### Wichtige Modelle

- **ClubSettings** – Name des Veranstalters, Logo, Kontaktdaten, Bestell-Pflichtfelder, Stornierungsfrist (Singleton)
- **FoodItem** – Gerichte pro Veranstaltung
- **Order** – Bestellung mit `orderNumber`, `orderDate`, `status`
- **DailyOrderCounter** – Atomarer Zähler für Tages-Bestellnummern
- **OrderStatus** – Status-Historie (Audit-Trail)
- **InstalledModule** – Modulstatus (`installed`, `enabled`, `config_json`, Health)
- **LegalPage** – Inhalte und Veröffentlichungsstatus für Impressum, Datenschutz, AGB, Widerruf

Modul-spezifische Tabellen (z. B. `payment_sessions`) werden ausschließlich in Modul-Migrationen verwaltet – nicht im Core-Schema.

### Datenbankschema

Schema-Änderungen werden über Prisma Migrate versioniert:

```bash
# Neue Migration erstellen (Entwicklung)
cd backend
npx prisma migrate dev --name beschreibung

# Nur lokale Schnell-Synchronisation (Entwicklung)
npx prisma db push
```

In Produktion/Docker: `prisma migrate deploy` via Entrypoint — **kein** `db push`.

Betrieb (Backup vor Update): [OPERATIONS.md](OPERATIONS.md).

### Seed

```bash
npm run seed
```

Erstellt Admin, Küchen-Mitarbeiter, Demo-Veranstaltung (in 14 Tagen) und 5 Gerichte.

### Test-Zugangsdaten

Nur für lokale Entwicklung und CI — **nicht** in Produktion belassen:

| Rolle | E-Mail | Passwort |
|-------|--------|----------|
| Administrator | admin@verein.local | admin123 |
| Mitarbeiter (Küche) | kueche@verein.local | staff123 |

---

## API-Design

Basis-URL: `/api`

### Öffentliche Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/public/club` | Veranstalterdaten (öffentlich) |
| GET | `/public/order-settings` | Pflichtfelder & Stornierungsfrist |
| GET | `/public/event` | Standard-Veranstaltung (heutiges Datum, falls eindeutig) |
| GET | `/public/events` | Online-buchbare Veranstaltungen |
| GET | `/public/events/pickup` | Veranstaltungen für Abholboard/Abholung |
| GET | `/public/menu?eventId=` | Speisekarte + Event-Info |
| POST | `/public/orders` | Online-Bestellung (Body: `eventId`, …) |
| POST | `/public/orders/lookup` | Status per Nummer + Nachname (Body: `eventId`, …) |
| GET | `/public/orders/:id` | Bestellung per ID (inkl. Storno-Infos) |
| POST | `/public/orders/:id/cancel` | Online-Bestellung stornieren (Nachname) |
| GET | `/public/pickup-board?eventId=` | Fertige Bestellungen einer Veranstaltung |
| GET | `/public/payment/status` | Onlinezahlung verfügbar? |
| GET | `/public/legal-links` | Veröffentlichte Rechtslinks für Footer/E-Mail |
| GET | `/public/legal/:slug` | Veröffentlichte Rechtsseite nach URL-Slug |
| GET | `/public/modules/menu` | Menüeinträge aktiver Module |

### Modul- & Payment-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | `/admin/modules` | Alle Module (Status, Version, Health) |
| POST | `/admin/modules/:id/install` | Modul installieren |
| POST | `/admin/modules/:id/activate` | Modul aktivieren |
| POST | `/admin/modules/:id/deactivate` | Modul deaktivieren |
| GET/PUT | `/admin/modules/:id/config` | Modul-Konfiguration |
| GET | `/modules/features/payment/status` | Payment verfügbar (Modul aktiv) |
| POST | `/modules/features/payment/webhooks/:providerId` | Webhook-Eingang |
| GET/PUT | `/modules/features/payment/admin/config` | Stripe-Keys, Provider |

Vollständige Modul-API: siehe [ADR-003](architecture/003-module-system.md) und [ADR-041](architecture/041-module-api-v3.md).

### Mitarbeiter-Endpunkte (JWT)

| Methode | Pfad | Rolle |
|---------|------|-------|
| POST | `/auth/login` | – |
| GET | `/staff/events` | ADMIN, STAFF |
| GET | `/staff/events/cashier` | Kassen-Veranstaltungen |
| GET | `/staff/events/pickup` | Abhol-Veranstaltungen |
| GET | `/staff/food-items` | Speisen-Katalog |
| PUT | `/staff/events/:id/food-item-assignments` | Speisen-Zuordnung |
| POST | `/staff/orders/cashier` | Body: `eventId`, `items`, … |
| POST | `/staff/orders/lookup` | Body: `eventId`, `orderNumber`, optional `lastName` |
| PATCH | `/staff/orders/:id/status` | ADMIN, STAFF |
| PUT | `/staff/club` | ADMIN |
| POST | `/staff/club/logo` | ADMIN |

### Admin-Endpunkte (JWT, ADMIN)

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/admin/ui` | Admin-UI-Katalog (Navigation, Seiten, Widgets) |
| GET/PUT | `/admin/settings/{namespace}` | Settings (z. B. `core.club`, `module.payment`, `module.notifications`) |
| GET | `/admin/email-settings` | Legacy-Delegierung → Notifications-Modul |

Payment-Admin (Modul aktiv): `/api/modules/features/payment/admin/*` – Dashboard, Provider, Zahlungen, Refunds, Webhooks, Health.

Vollständige Liste: siehe `backend/src/routes/index.ts` und Modul-`routes.ts`.

---

## Realtime (Socket.IO)

### Events (Server → Client)

| Event | Beschreibung |
|-------|-------------|
| `order:created` | Neue Bestellung |
| `order:updated` | Statusänderung |
| `event:updated` | Veranstaltung geändert |
| `fooditems:updated` | Speisekarte geändert |

### Rooms

- `event:{eventId}` – Alle Clients einer Veranstaltung
- `order:{orderId}` – Kundenstatusseite

### Client beitreten

```typescript
socket.emit('join:event', eventId);
socket.emit('join:order', orderId);
```

---

## Vorausbestellungen

**Wichtig:** `orderDate` und die Tages-Bestellnummer beziehen sich immer auf den **Veranstaltungstag**, nicht auf den Bestellzeitpunkt.

```
Kunde bestellt am 01.07. ──► Veranstaltung am 15.08.
                              orderDate = 15.08.
                              orderNumber = 001, 002, …
```

Implementierung in `backend/src/utils/helpers.ts`:

- `getEventOrderDate(event.date)` – normalisiertes Veranstaltungsdatum
- `formatEventDate()` – deutsche Datumsanzeige

Küche und Abholung sehen am Veranstaltungstag alle Bestellungen – auch solche, die Wochen vorher aufgegeben wurden.

**Wichtig (Zahlung & Küchenfreigabe):**

- Im **Mitarbeiterbereich** sind Bestellungen **immer sichtbar** (unabhängig vom Zahlstatus). Der Zahlstatus wird als Label angezeigt.
- In der **Küche** erscheinen Bestellungen erst, wenn sie **für die Küche freigegeben** wurden (`Order.released_to_kitchen`).
  - Vor-Ort-Bestellungen werden sofort freigegeben.
  - Online-Bestellungen werden nach erfolgreicher Online-Zahlung automatisch freigegeben oder können in der Bestellliste manuell freigegeben werden.

---

## Authentifizierung

- JWT Bearer Token im Header `Authorization: Bearer <token>`
- Rollen: `ADMIN`, `STAFF`
- Öffentlicher Bereich: kein Token erforderlich
- Token-Gültigkeit: konfigurierbar via `JWT_EXPIRES_IN` (Standard: 8h)

### Passwortlose Anmeldung (v2.1)

| Endpunkt | Beschreibung |
|----------|-------------|
| `GET /api/public/auth-config` | Öffentliche Auth-Modi |
| `POST /api/auth/magic-link` | Magic Link anfordern |
| `POST /api/auth/login-code` | Login-Code anfordern |
| `POST /api/auth/verify-magic-link` | Magic Link einlösen |
| `POST /api/auth/verify-login-code` | Code einlösen |

Konfiguration: `platform.auth.*` in Plattform-Einstellungen. Tokens in `auth_login_tokens` (SHA-256 Hash, einmalig, TTL konfigurierbar). Siehe [ADR-033](architecture/033-passwordless-authentication.md).

### Zentraler MailService (v2.1)

Alle E-Mails über `backend/src/platform/mail/MailService.ts`. Keine direkten SMTP-Zugriffe in Modulen. Siehe [ADR-031](architecture/031-central-mail-service.md).

### Initial Setup (v2.1)

Setup-Status in `TenantSettings.extraJson.initialSetup`. API unter `/api/setup/*`. Siehe [ADR-032](architecture/032-initial-setup-wizard.md).

---

## Tests

```bash
# Gesamte QA-Pipeline lokal (nach Docker-Start)
npm run qa:wait && npm run qa:api && npm run qa:e2e          # Smoke-E2E
PLAYWRIGHT_WORKERS=1 npm run qa:e2e:journey                 # Nutzerreise (serial)

# Backend (Node 20+ aktivieren, z. B. nvm use 20)
cd backend && npm run prisma:generate && npm test

# Frontend
cd frontend && npm test
```

Details zu CI-Jobs und Artefakten: [ADR-011](architecture/011-quality-assurance.md).

Installer (Shell, ohne Node):

```bash
./installer/tests/run-tests.sh
```

### Screenshots generieren

```bash
cd frontend && npm run build
cd .. && npm install
npm run screenshots
```

Voraussetzungen: Playwright-Browser (`npx playwright install chromium`), Python 3 mit Pillow (`python3-pil` oder `pip install Pillow`) für Geräte-Mockups.

Alternativ per Docker (Playwright-Image + `python3-pil`):

```bash
docker run --rm -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.52.0-jammy \
  bash -c "apt-get update -qq && apt-get install -y -qq python3-pil && cd frontend && npm install && npm run build && cd .. && npm install && npm run screenshots"
```

Neue Screenshots (u. a. `21-payment-admin.png`, `22-payment-einstellungen.png`) werden automatisch mit erzeugt.

Umgebungsvariablen für die Screenshot-Pipeline:

| Variable | Beschreibung |
|----------|-------------|
| `FRONTEND_DIST` | Optional: alternativer Pfad zu `frontend/dist` (z. B. nach Build in temp-Verzeichnis) |
| `START_FROM` | Ab einem Screenshot-Namen fortsetzen (z. B. `START_FROM=16-admin-uebersicht`) |
| `SKIP_DEVICES` | `1` = Geräte-Mockups der Bestellseite (01-*) überspringen |

Die Rohdaten für Geräte-Mockups landen in `$TMPDIR/festschmiede-screenshots-raw` (nicht mehr unter `docs/screenshots/_raw`).

---

## Deployment

### Umgebungsvariablen (Produktion)

| Variable | Beschreibung |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL-Verbindung |
| `JWT_SECRET` | Langer zufälliger String |
| `CORS_ORIGIN` | Frontend-URL (CORS, Socket.IO und Links in E-Mails) |
| `APP_ENCRYPTION_KEY` | Optional: Verschlüsselung von Secrets in der DB (Payment, SMTP) |
| `MODULES_DIR` | Optional: Pfad zu Modulen (Docker: `/app/modules`) |

### Docker Compose

```bash
docker compose pull
docker compose up -d
docker compose exec backend npm run seed
```

Verwendet Images aus der GitHub Container Registry (`GHCR_IMAGE_PREFIX`, `IMAGE_TAG` in `.env`).

Produktions-Checklisten, Backup und Restore: [OPERATIONS.md](OPERATIONS.md).

### Docker Images (GitHub Container Registry)

Images werden nach erfolgreichem **Release Validation**-Gate automatisch veröffentlicht (`.github/workflows/release-validation.yml`, Job `Docker Images`):

- `ghcr.io/<owner>/FestSchmiede/backend`
- `ghcr.io/<owner>/FestSchmiede/frontend`

**Auslöser:**

| Auslöser | Ablauf | Tags |
|----------|--------|------|
| GitHub Release veröffentlicht | Nutzerreise + Security → Image-Build | Semver (`v2.4.36`, `2.4`, `2`), `sha-<commit>` |
| Manuell (`workflow_dispatch` auf Release Validation) | Optional mit Tag-Parameter | `latest`, `sha-<commit>` |

**Release erstellen:** GitHub → Releases → Create new release → `release-validation.yml` startet automatisch.

Optionale Repository-Variablen für den Frontend-Build:

| Variable | Beschreibung |
|----------|-------------|
| `VITE_API_URL` | API-URL im Frontend-Image |
| `VITE_WS_URL` | WebSocket-URL im Frontend-Image |
| `VITE_TURNSTILE_SITE_KEY` | Optional: Cloudflare Turnstile (Bot-Schutz) |

### Routen (Auszug)

| Bereich | Prefix | Beispiele |
|---------|--------|-----------|
| Öffentlich | `/` | Bestellseite, `/kontakt`, `/abholboard` |
| Mitarbeiter | `/mitarbeiter` | Küche, Abholung, Bestellungen |
| Administration | `/admin` | Verein, Benutzer, Veranstaltungen, Module, Payment |
| API Admin | `/api/admin` | `/users`, `/club`, `/modules` |
| API Module | `/api/modules/features/{id}` | Modul-Routen (nur wenn aktiviert) |

---

## Erweiterungspunkte

Die Architektur nutzt ein **Feature-Modulsystem**. Vollständige Dokumentation:

→ **[ADR-003](architecture/003-module-system.md)** · **[ADR-041](architecture/041-module-api-v3.md)**

→ **[architecture/README.md](./architecture/README.md)** (ADRs, Projektanalyse, Migrationsplan)

| Feature | Modul |
|---------|-------|
| Online-Zahlung | `modules/payment/` ✅ |
| Rechtliche Informationen | `modules/legal/` ✅ |
| Lagerverwaltung | `modules/inventory/` |
| Bondruck | `modules/printer/` |
| Gutscheine | `modules/voucher/` |
| Rabatte | `modules/discount/` |
| QR-Einlass | `modules/checkin/` |
| Benachrichtigungen | `modules/notifications/` ✅ |
| Auswertungen | `modules/analytics/` |
| Treueprogramm | `modules/loyalty/` |
| Kassenanbindung | `modules/cash-register/` |

Neue Feature-Module implementieren das `Module`-Interface. Core-Änderungen nur über Hooks.

### Legal Content Extension Point

Das Legal-Modul registriert den Extension Point `legalContentRegistry`. Der Core verwendet ihn für:

- öffentliche Routen `/api/public/legal-links` und `/api/public/legal/:slug`
- Footer-Links auf der Bestellseite
- Footer-Links in E-Mail-Benachrichtigungen

Wichtig: Ohne aktiviertes Modul bleibt die Plattform unverändert; der Registry-Zugriff liefert dann keine öffentlichen Seiten.

### Notification-Modul (Phase 7)

Mandantenfähige Kommunikation über `modules/notifications/`:

- SMTP: Mandant zuerst, Plattform-Fallback (`resolveSmtpConfig`)
- Branding: `notificationBranding.ts`, Tenant-URLs via `notificationTenantContext.ts`
- Delivery-Log: `notification_deliveries` (tenant-scoped)
- Keine direkten Sends aus anderen Modulen – nur Hooks

→ **[ADR-008](architecture/008-notification-module.md)** · Admin: [ADMIN_GUIDE](ADMIN_GUIDE.md)

### Security (Phase 8)

Multi-Tenant-Härtung und OWASP-Review:

- Host-Validation: `TenantResolver` + Trust Proxy
- Upload-Zugriff: `uploadAccess` Middleware
- WebSocket-Isolation: `socket/index.ts`
- JWT `tenantId`-Binding

→ **[SECURITY.md](../SECURITY.md)** · **[ADR-029](./architecture/029-multi-tenant-security-hardening.md)**

### Performance (Phase 9)

Lasttests, DB-Indizes, Monitoring, Frontend Code Splitting:

- `npm run qa:performance` — API-Baseline
- `npm run qa:load` — k6 Lasttests
- `performanceMetrics` + erweiterter Health-Check

→ **[ADR-030](architecture/030-performance-scalability.md)** · Lasttests: `npm run qa:perf`

### Payment & PayableResource

Das Payment-Modul arbeitet ausschließlich mit `PayableResource` – es kennt keine Bestellungen. Der Core registriert Bestellungen als zahlbare Ressource:

- `backend/src/core/payable/orderPayableAdapter.ts` – Adapter für `type: 'order'`
- `backend/src/core/payable/registerPayables.ts` – Registrierung beim App-Start

**Neue zahlbare Ressource hinzufügen:**

1. `PayableResourceAdapter` implementieren (`toPayableResource`, `onPaymentCompleted`, `onPaymentFailed`)
2. In `registerPayables()` oder im eigenen Modul bei `enable()` registrieren
3. Im Domänen-Service `paymentServiceRegistry.isAvailable()` prüfen und ggf. `createCheckout()` aufrufen

**Neuen Payment-Provider hinzufügen:** siehe [ADR-007](architecture/007-payment-module.md).

**Umgebungsvariable:** `APP_ENCRYPTION_KEY` (min. 32 Zeichen empfohlen) für verschlüsselte API-Keys und Passwörter in der Datenbank.
