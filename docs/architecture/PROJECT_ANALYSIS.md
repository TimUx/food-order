# Projektanalyse – FestManager-Plattform

Vollständige Ist-Analyse auf Basis des Codestands nach Release **v1.2.0** (Modulare Plattform & Payment-Modul).

---

## 1. Architektur (Gesamt)

### Paradigma

**Modularer Monolith** – ein deploybares Backend mit eingebettetem Modulsystem, React-SPA-Frontend, PostgreSQL.

### Prinzip

```
Core kennt keine Plugins.
Plugins kennen den Core.
```

### Komponentenübersicht

| Komponente | Technologie | Pfad |
|------------|-------------|------|
| Frontend | React 19, Vite 6, MUI 7, PWA | `frontend/` |
| Backend API | Express 5, TypeScript, Socket.IO | `backend/src/` |
| Modulsystem | Custom Framework | `backend/src/module-system/` |
| Offizielle Module | TypeScript | `backend/modules/` |
| Datenbank | PostgreSQL 16, Prisma 6 | `backend/prisma/` |
| Deployment | Docker Compose, GHCR | `docker-compose.yml` |
| CI/CD | GitHub Actions | `.github/workflows/docker-publish.yml` |

### Datenfluss (Bestellung)

```
Kunde (Browser)
  → POST /api/public/orders
  → orderService.createOnlineOrder()
  → [optional] paymentServiceRegistry → Stripe Checkout
  → orderRepository (Prisma)
  → [nach Zahlung] emitOrderCreated + Hooks
  → Socket.IO → Küche / Dashboard
```

---

## 2. Frontend

### Struktur

~43 Dateien unter `frontend/src/`, drei Bereiche:

| Bereich | Prefix | Layout | Auth |
|---------|--------|--------|------|
| Öffentlich | `/`, `/kontakt`, `/status`, `/abholboard` | PublicLayout / none | nein |
| Mitarbeiter | `/mitarbeiter/*` | StaffLayout | JWT (ADMIN+STAFF) |
| Admin | `/admin/*` | AdminLayout | JWT (nur ADMIN) |

### State Management

- `AuthContext` – JWT in `localStorage` (`verein_token`)
- `ClubContext` – öffentliche Veranstalterdaten + Socket `club:updated`
- `ThemeContext` – Light/Dark in `localStorage`
- Kein React Query/Redux – page-local `useState`/`useEffect`

### API-Client

Monolithische `services/api.ts` – `fetch`-Wrapper, `ApiError`, gruppierte Endpunkte.

### Modul-Integration (Frontend)

- `module-system/useModules.ts` – Admin Lifecycle
- `module-system/ModuleRegistry.ts` – Menü-Cache
- Nur **Payment** hat dedizierte Settings-Seite
- `widgets`, `requiredPermission`, Modul-Icons nicht implementiert

### PWA

`vite-plugin-pwa`, Workbox, precache. **Fehlende Assets:** `pwa-192x192.png`, `pwa-512x512.png` in `public/`.

### Coding Style (Frontend)

- Funktionskomponenten, named exports
- Deutsch UI, `@/` Path-Alias
- MUI `sx`, Touch-Presets in `theme/touch.ts`
- `tsc -b && vite build`, strict TypeScript
- Kein ESLint/Prettier konfiguriert

---

## 3. Backend

### Schichten

```
routes/index.ts → controllers/ → services/ → repositories/ + Prisma
```

**Abweichung:** Die meisten Services nutzen Prisma direkt; nur `clubRepository` ist extrahiert.

### Modulsystem

| Klasse/Modul | Funktion |
|--------------|----------|
| `ModuleDiscovery` | Scannt `modules/`, `plugins/` |
| `ModuleLoader` | Dynamic import (`.ts` dev, `dist/modules` prod) |
| `ModuleManager` | Lifecycle, Route-Mount, Upgrades |
| `ModuleRegistry` | In-Memory + DB |
| `FeatureHooks` | Pub/Sub |
| `FeatureContext` | Modul-Config in `InstalledModule.configJson` |
| `DependencyResolver` | Required-Module-Checks |

### Extension Points

- `payableResourceRegistry` / `paymentServiceRegistry`
- `CORE_HOOKS` (ORDER_CREATED, ORDER_PAID, …)
- Modul-Routes, Menüs, Widgets, Permissions (deklarativ)

### Legacy / Duplikat

**`backend/src/features/`** – 19 Dateien, alter Payment-/Stub-Code, **nicht mehr aktiv** (aktiv: `backend/modules/`).

### Coding Style (Backend)

- Singleton-Objekte (`export const orderService = { ... }`)
- Klassen für Module-Framework und Payment-Provider
- Zod-Validierung in Middleware
- Deutsche `AppError`-Meldungen
- TypeScript strict, CommonJS

---

## 4. Datenbank

### Core (Prisma)

| Modell | Zweck |
|--------|-------|
| User, Role | Auth (ADMIN, STAFF) |
| Event, FoodItem | Veranstaltung + Menü |
| Order, OrderItem, OrderStatus | Bestellungen + Audit |
| Customer | Kundendaten (optional) |
| DailyOrderCounter | Tages-Bestellnummern |
| ClubSettings | Singleton Vereins-/SMTP-Config |
| InstalledModule | Modul-Status + `configJson` |

### Modul-Tabellen (außerhalb Prisma)

- `payment_sessions`, `payment_transactions` – Raw SQL via `paymentRepository`

### Schema-Management

- **`prisma db push`** beim Docker-Start – keine versionierten Core-Migrationen
- Modul-Migrationen: SQL-Dateien in `modules/{id}/migrations/`

---

## 5. Authentifizierung

| Aspekt | Implementierung |
|--------|-----------------|
| Mechanismus | JWT Bearer (`jsonwebtoken`) |
| Speicherung Client | `localStorage` |
| Middleware | `authenticate` → `loadUser` → `requireRole` |
| Rollen | ADMIN, STAFF (DB + JWT) |
| Modul-Permissions | Deklariert, **nicht erzwungen** |
| Öffentlich | Kein Token, Bot-Schutz (Honeypot, Timing, Turnstile optional) |
| Passwort | bcrypt (cost 12) |

---

## 6. Docker

### Compose-Services

| Service | Image | Port |
|---------|-------|------|
| postgres | postgres:16-alpine | 5432 |
| backend | ghcr.io/.../backend | 3001 |
| frontend | ghcr.io/.../frontend | 5173→80 |

**Kein `build:` in compose** – nur Image-Pull.

### Backend-Image

- Multi-stage Node 22 Alpine
- Kopiert `src/` + `modules/`
- CMD: `prisma db push && node dist/src/index.js`
- `MODULES_DIR=/app/modules`

### Frontend-Image

- Build-args: `VITE_API_URL`, `VITE_WS_URL`, `VITE_TURNSTILE_SITE_KEY`
- nginx mit Proxy zu `backend:3001` für `/api/`, `/socket.io/`

### Lücken

- `APP_ENCRYPTION_KEY` optional in compose env (empfohlen bei Payment/SMTP)
- `docker compose up --build` in Docs erwähnt, aber compose baut nicht

---

## 7. API

### Struktur

Basis: `/api`

| Namespace | Auth | Beispiele |
|-----------|------|-----------|
| `/public/*` | – | orders, menu, club, payment/status |
| `/auth/*` | mixed | login, me |
| `/staff/*` | JWT STAFF+ADMIN | orders, events, stats |
| `/admin/*` | JWT ADMIN | users, club, modules |
| `/modules/features/{id}/*` | Modul aktiv | payment webhooks, config |

### Realtime

Socket.IO: `order:created`, `order:updated`, `event:updated`, `club:updated`, `fooditems:updated`

Rooms: `event:{id}`, `order:{id}`

### Validierung

Zod in `validation/schemas.ts`, Middleware `validateBody`/`validateParams`

---

## 8. Routing (Frontend)

Alle Routen in `App.tsx` – keine Lazy Imports.

**Legacy-Redirects:** `/mitarbeiter/kasse` → Abholung, `/mitarbeiter/verein` → `/admin/verein`, etc.

**Modul-Routen:** `/admin/module`, `/admin/payment` (Payment-Admin), `/admin/settings/module.*`, Legacy-Redirect `/admin/module/payment` → `/admin/payment`

---

## 9. Module

### Aktiv im Image (10)

| ID | Version | Implementierung |
|----|---------|-----------------|
| payment | 1.0.0 | Vollständig (Stripe, Admin-UI, Smart Payment) |
| notifications | 1.0.0 | Vollständig (SMTP, ntfy, Discord, Slack, Teams) |
| inventory, printer, voucher, discount, analytics, loyalty, checkin, cash-register | 0.1.0 | Stub (`createStubModule`) |

### Abhängigkeiten

- `voucher` → `payment` (required), `inventory` (optional)

### Lifecycle-API

`POST /api/admin/modules/:id/{install,activate,deactivate,uninstall,reinitialize}`
`GET /api/admin/modules/:id/health`

---

## 10. Konfiguration

| Ebene | Mechanismus |
|-------|-------------|
| `.env` | JWT, DB, CORS, MODULES_DIR, APP_ENCRYPTION_KEY |
| SettingsService | Verein, Bestellung, Modul-Settings (SMTP, Payment) |
| InstalledModule.configJson | Modul-Config (Zod-validiert) |
| VITE_* | Frontend Build-Zeit |

---

## 11. Bewertung

### Was kann übernommen werden?

| Bereich | Bewertung |
|---------|-----------|
| Modul-Lifecycle + ModuleManager | ✅ Produktionsreif, gut dokumentiert |
| Payment + PayableResource | ✅ Architektur solide, Stripe implementiert |
| Drei-Bereich-Frontend (public/staff/admin) | ✅ Bewährt |
| Docker + GHCR Deployment | ✅ Passt zu Zielgruppe Vereine |
| Socket.IO Echtzeit | ✅ Küche/Abholboard funktionieren |
| Zod-Validierung | ✅ Konsistent |
| Admin-Modulverwaltung UI | ✅ Grundlage vorhanden |
| Dokumentation (ADMIN/USER/DEV/MODULE) | ✅ Umfangreich |
| Screenshot-Pipeline | ✅ Playwright + Mocks |

### Was muss refaktoriert werden?

| Priorität | Thema | Detail |
|-----------|-------|--------|
| **Hoch** | `backend/src/features/` löschen | Toter Duplikat-Code |
| **Hoch** | Modul-Permissions erzwingen | ADR-005 |
| **Hoch** | Route-Unmount bei Deaktivierung | Express-Router bleiben gemountet |
| **Mittel** | Generische Modul-Settings-UI | Statt hardcodierter Payment-Page |
| **Mittel** | Payment DB in Prisma oder dokumentierte Raw-SQL-Policy | Zwei Zugriffsmuster |
| **Mittel** | `getReleasedResourceIds` N+1 | Performance bei vielen Bestellungen |
| **Mittel** | Frontend: Lazy Routes, React Query | Skalierung |
| **Mittel** | `docker-compose` env vervollständigen | `APP_ENCRYPTION_KEY` |
| **Niedrig** | Repository-Schicht vereinheitlichen | Oder bewusst als optional dokumentieren |
| **Niedrig** | PWA-Icons ergänzen | Fehlende PNGs |
| **Niedrig** | API-Integrationstests | supertest vorhanden, ungenutzt |
| **Niedrig** | `package.json` Version → 1.2.0 | Sync mit Releases |

### Risiken

| Risiko | Schwere | Mitigation |
|--------|---------|------------|
| `prisma db push` in Produktion | Hoch | Prisma Migrate einführen |
| Modul deaktiviert, Routes noch erreichbar | Mittel | Unmount oder Neustart dokumentieren |
| Placeholder-Provider aktivierbar | Mittel | UI sperren / Health degraded |
| JWT/Payment Default-Secrets | Hoch | Deployment-Checkliste |
| Module ↔ Core compile-time coupling | Mittel | SDK (ADR-010) |
| Kein CI-Test/Lint | Mittel | GitHub Actions erweitern |
| Frontend ohne Error Boundary | Niedrig | Globaler Error Boundary |
| E-Mail im Core vs. Notifications-Modul | Niedrig | ADR-008 Migrationsplan |

### Abhängigkeiten

#### Runtime (Backend)

| Paket | Version | Zweck |
|-------|---------|-------|
| express | ^5.1.0 | HTTP |
| @prisma/client | ^6.9.0 | ORM |
| socket.io | ^4.8.1 | Realtime |
| stripe | ^17.7.0 | Payment |
| zod | ^3.25.67 | Validierung |
| jsonwebtoken, bcryptjs | – | Auth |

#### Runtime (Frontend)

| Paket | Version | Zweck |
|-------|---------|-------|
| react | ^19.1.0 | UI |
| @mui/material | ^7.1.1 | Components |
| react-router-dom | ^7.6.2 | Routing |
| socket.io-client | ^4.8.1 | Realtime |
| vite-plugin-pwa | ^1.0.0 | PWA |

#### Modul-Abhängigkeiten (logisch)

```
voucher ──requires──► payment
voucher ──optional──► inventory
payment ──uses──► payableResourceRegistry ◄── orderPayableAdapter (Core)
```

#### Infrastruktur

- PostgreSQL 16
- Docker / GHCR
- Optional: Cloudflare Turnstile, Stripe, SMTP

---

## 12. Coding Style (Zusammenfassung)

| Aspekt | Konvention |
|--------|------------|
| Sprache Code | Englisch (Identifiers) |
| Sprache UI/Docs/Fehler | Deutsch |
| TypeScript | strict, keine any (angestrebt) |
| Backend Export | `export const xService = {}` |
| Module | Klassen extends `BaseModule` |
| Validierung | Zod |
| Tests | Vitest (minimal – 3 Dateien) |
| Commits | Englisch, beschreibend |
| Docs | Deutsch, Markdown |

---

## Verweise

- [Architecture ADRs](./README.md)
- [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)
- [MODULE_ARCHITECTURE.md](../MODULE_ARCHITECTURE.md)
