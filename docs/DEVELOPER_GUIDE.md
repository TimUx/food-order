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

ADRs: [020–027](architecture/README.md#version-20--multi-tenant) · Phase 1–6: [Reports](architecture/README.md#version-20--multi-tenant) · [Frontend Guide](FRONTEND_GUIDE.md) · [Deployment Guide](DEPLOYMENT.md) · [Docker Guide](DOCKER.md)

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

Linkgenerierung (QR, E-Mails, Routing, SEO) nutzt ausschließlich `PlatformDomainService`. Details: [Canonical Domain Report](architecture/CANONICAL_DOMAIN_COMPLETION_REPORT.md).

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
│   ├── MODULE_ARCHITECTURE.md
│   └── USER_GUIDE.md
├── scripts/
│   └── capture-screenshots.ts
└── docker-compose.yml
```

---

## Lokale Entwicklung

### Voraussetzungen

- Node.js 22+
- PostgreSQL 16+
- npm

### Backend starten

```bash
cd backend
cp ../.env.example .env
# DATABASE_URL in .env anpassen
npm install
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
| GET | `/public/event` | Aktive Veranstaltung |
| GET | `/public/menu` | Speisekarte + Event-Info |
| POST | `/public/orders` | Online-Bestellung |
| POST | `/public/orders/lookup` | Status per Nummer + Nachname |
| GET | `/public/orders/:id` | Bestellung per ID (inkl. Storno-Infos) |
| POST | `/public/orders/:id/cancel` | Online-Bestellung stornieren (Nachname) |
| GET | `/public/pickup-board` | Fertige Bestellungen |
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

Vollständige Modul-API: siehe [MODULE_ARCHITECTURE.md](./MODULE_ARCHITECTURE.md#api-endpunkte).

### Mitarbeiter-Endpunkte (JWT)

| Methode | Pfad | Rolle |
|---------|------|-------|
| POST | `/auth/login` | – |
| GET | `/staff/events` | ADMIN, STAFF |
| POST | `/staff/orders/cashier` | ADMIN, STAFF |
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

Bei aktivem **Payment-Modul** erscheinen Online-Bestellungen erst in der Küche, nachdem die Zahlung abgeschlossen wurde. Unbezahlte Bestellungen werden per `paymentServiceRegistry.filterReleasedIds()` ausgefiltert.

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

> **v2.0:** Multi-Tenant-Tests werden erst ab Phase 1 implementiert. Geplante Testebenen: Resolver-Unit-Tests, API-Isolation (Cross-Tenant), Security (Host-Spoofing, CORS), Migrations-Tests. Bestehende Tests (`tests/api/*`, `tests/integration/*`, `tests/e2e/*`) werden in Phase 1 um Standard-Mandant-Fixtures ergänzt. Details: [ADR-020](architecture/020-multi-tenant-platform.md#teststrategie-zukunft).

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
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

Der Workflow `.github/workflows/docker-publish.yml` baut und veröffentlicht Images unter:

- `ghcr.io/<owner>/FestSchmiede/backend`
- `ghcr.io/<owner>/FestSchmiede/frontend`

**Auslöser:**

| Auslöser | Tags |
|----------|------|
| Manuell (`workflow_dispatch`) | `latest`, `sha-<commit>` |
| Release veröffentlicht | Semver-Tags (`1.0.0`, `1.0`, `1`), `sha-<commit>` |

**Manuell starten:** GitHub → Actions → „Docker Images“ → Run workflow

**Release:** GitHub → Releases → Create new release → Workflow startet automatisch

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

→ **[MODULE_ARCHITECTURE.md](./MODULE_ARCHITECTURE.md)** (operative Modul-Doku)

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

→ **[NOTIFICATION_GUIDE.md](./NOTIFICATION_GUIDE.md)**

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

→ **[PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md)** · **[ADR-030](./architecture/030-performance-scalability.md)**

### Payment & PayableResource

Das Payment-Modul arbeitet ausschließlich mit `PayableResource` – es kennt keine Bestellungen. Der Core registriert Bestellungen als zahlbare Ressource:

- `backend/src/core/payable/orderPayableAdapter.ts` – Adapter für `type: 'order'`
- `backend/src/core/payable/registerPayables.ts` – Registrierung beim App-Start

**Neue zahlbare Ressource hinzufügen:**

1. `PayableResourceAdapter` implementieren (`toPayableResource`, `onPaymentCompleted`, `onPaymentFailed`)
2. In `registerPayables()` oder im eigenen Modul bei `enable()` registrieren
3. Im Domänen-Service `paymentServiceRegistry.isAvailable()` prüfen und ggf. `createCheckout()` aufrufen

**Neuen Payment-Provider hinzufügen:** siehe [Payment-Modul in MODULE_ARCHITECTURE.md](./MODULE_ARCHITECTURE.md#payment-modul).

**Umgebungsvariable:** `APP_ENCRYPTION_KEY` (min. 32 Zeichen empfohlen) für verschlüsselte API-Keys und Passwörter in der Datenbank.
