# ADR-021: Tenant Context & Platform Context

| Feld | Wert |
|------|------|
| **Status** | Accepted (implementiert Phase 1) |
| **Datum** | 2026-07-09 |
| **Version** | 2.0 |
| **Abhängigkeiten** | ADR-020, ADR-023 |

## Problem

Ohne zentrale Kontextobjekte würden Module, Services und Controller den aktuellen Mandanten selbst aus Hostname, URL, Subdomain oder Request-Parametern ableiten. Das führt zu inkonsistenter Logik, Sicherheitslücken (Host-Header-Manipulation) und hohem Wartungsaufwand.

Der Ist-Zustand nutzt implizit einen einzigen Mandanten über `ClubSettings` mit `id: "default"` und `clubService` ohne Mandantenfilter.

## Motivation

Jede Anfrage muss eindeutig einem **Mandanten** (oder der **Plattform**) zugeordnet sein. Geschäftslogik, Datenbankzugriffe und Module sollen den Mandanten über eine einzige, vertrauenswürdige Schnittstelle beziehen – analog zum bestehenden `FeatureContext` für Module.

## Entscheidung

Zwei getrennte Kontexte werden eingeführt:

### TenantContext

Zentraler, request-scoped Kontext für den aktuellen Mandanten.

**Geplante Implementierung** (`backend/src/platform/context/TenantContext.ts`):

```typescript
interface TenantContextData {
  tenantId: string;
  slug: string;
  subdomain: string;
  name: string;           // Anzeigename (UI: „Veranstalter“)
  status: TenantStatus;   // ACTIVE | SUSPENDED | ARCHIVED | PENDING
  locale: string;
  timezone: string;
  currency: string;
  theme: string;
}

// Request-Scope via AsyncLocalStorage
export const TenantContext = {
  run<T>(data: TenantContextData, fn: () => T): T;
  get(): TenantContextData | undefined;
  require(): TenantContextData;  // wirft TenantNotResolvedError
  getTenantId(): string;
  isSet(): boolean;
};
```

**Middleware-Kette** (nach `TenantResolver`):

```
HTTP Request
  → TenantResolver.resolve(req)     // einzige Host-/URL-Auswertung
  → TenantContextMiddleware         // setzt AsyncLocalStorage
  → routes / controllers / services // lesen nur TenantContext
```

**Verbindliche Regeln:**

| Regel | Beschreibung |
|-------|--------------|
| Kein Host-Parsing in Modulen | `req.hostname`, `req.headers.host` nur im Resolver |
| Kein `tenant_id` in APIs | Weder Query, Body noch Path-Parameter |
| `requireTenant()` auf geschützten Routen | Öffentliche Plattform-Routen ohne Mandant explizit ausnehmen |
| Repositories filtern immer | Jede Query enthält `where: { tenantId }` aus Context |

**Integration in bestehende Plattform:**

| Komponente | Anpassung |
|------------|-----------|
| `FeatureContext` | Ergänzung `getTenantId(): string` delegiert an `TenantContext` |
| `clubService` | Wird zu mandantenscharfem Settings-Zugriff |
| `SettingsService` | Namespaces lesen/schreiben im Scope des aktuellen Mandanten |
| `AuditService` | `tenantId` in Audit-Einträgen |
| `PermissionService` | Berechtigungen im Mandanten-Scope |
| Module | `context.getTenantId()` statt eigener Auflösung |

### PlatformContext

Request-scoped Kontext für **ausschließlich plattformweite** Informationen. Enthält **keine** Mandantendaten.

**Geplante Implementierung** (`backend/src/platform/context/PlatformContext.ts`):

```typescript
interface PlatformContextData {
  platformName: string;
  baseDomain: string;           // z. B. festmanager.org
  wildcardDomain: string;       // z. B. *.festmanager.org
  platformVersion: string;      // aus package.json / IMAGE_TAG
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  allowedOrigins: string[];     // für CORS-Validierung
  defaultLocale: string;
  defaultTimezone: string;
  defaultTheme: string;
  registrationEnabled: boolean;
  updateChannel: 'stable' | 'beta';
}

export const PlatformContext = {
  run<T>(data: PlatformContextData, fn: () => T): T;
  get(): PlatformContextData;
  isMaintenanceMode(): boolean;
};
```

**Initialisierung:**

- Beim App-Start aus `PlatformSettings` (DB) und Infrastruktur-`.env` geladen
- Pro Request über Middleware verfügbar (kein erneutes DB-Lesen; Cache mit TTL)
- `PlatformContext` ist auf **allen** Requests gesetzt, auch ohne Mandant

### Frontend: TenantProvider

**Geplante Implementierung** (`frontend/src/contexts/TenantProvider.tsx`):

```typescript
interface TenantPublicData {
  name: string;
  logoUrl?: string;
  description?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  theme?: string;
  locale?: string;
}

// Ersetzt ClubProvider perspektivisch
export function TenantProvider({ children }: { children: ReactNode });
export function useTenant(): { tenant: TenantPublicData; loading: boolean; refresh: () => Promise<void> };
```

**Verbindliche Regeln (Frontend):**

| Regel | Beschreibung |
|-------|--------------|
| Kein `window.location.hostname`-Parsing | Mandantendaten kommen vom Backend |
| `useTenant()` statt `useClub()` | UI-Texte bleiben „Veranstalter“ |
| `PlatformProvider` für Plattformseiten | Name, Logo, Wartungsmodus auf `festmanager.org` |

**API-Aufruf:**

Das Frontend sendet **keinen** Mandanten-Identifier. Der Resolver bestimmt den Mandanten serverseitig aus dem Request-Host. Das Frontend lädt öffentliche Mandantendaten über `GET /api/public/tenant` (neu, Phase 1).

### Abgrenzung TenantContext vs. PlatformContext

| Aspekt | TenantContext | PlatformContext |
|--------|---------------|-----------------|
| Gültigkeit | Nur mandantenbezogene Requests | Alle Requests |
| Datenquelle | `tenants`-Tabelle via Resolver | `platform_settings`-Tabelle |
| Enthält Mandantendaten | Ja | Nein |
| Beispiel-Routen | `asv-libelle.festmanager.org/*` | `festmanager.org`, `/api/platform/*` |
| Fehler bei fehlendem Context | `TenantNotResolvedError` (404) | Nicht anwendbar (immer gesetzt) |

## Alternativen

| Alternative | Bewertung |
|-------------|-----------|
| Globaler Singleton `currentTenant` | Nicht thread-safe bei parallelen Requests → abgelehnt |
| `tenant_id` in JWT-Claims allein | Reicht nicht für öffentliche Routen; JWT optional → ergänzend, nicht primär |
| Express `req.tenant` Property | Funktional, aber nicht in Hintergrund-Jobs/Socket-Handlern verfügbar → `AsyncLocalStorage` bevorzugt |
| Zusammenlegung Tenant + Platform | Vermischt Verantwortlichkeiten → abgelehnt |

## Auswirkungen

- Neue Middleware vor allen mandantenbezogenen Routen
- Alle Services und Repositories müssen `TenantContext` nutzen (Phase 1+)
- `ClubContext` wird perspektivisch durch `TenantProvider` ersetzt (Alias-Übergang möglich)
- Background-Jobs und Socket-Handler müssen Context explizit setzen (`TenantContext.run()`)
- Tests benötigen Context-Setup oder Default-Mandant-Fixture

## Risiken

| Risiko | Mitigation |
|--------|------------|
| Vergessener `tenant_id`-Filter | Repository-Basisklasse; Lint-Regel; Code-Review |
| Context-Verlust in async Callbacks | `AsyncLocalStorage` statt manuellem Thread-Local |
| Fehlender Context in Tests | Zentrale Test-Fixture `withTenant(id, fn)` |

## Spätere Erweiterungen

- `TenantContext`-Propagation in Worker-Queues (Bull/BullMQ)
- Read-Only-Replica-Hinweis im Context für Reporting
- Mandanten-Impersonation für Plattform-Admins (mit Audit)
- `PlatformContext`-Webhook bei Settings-Änderung (Cache-Invalidierung)

## Verwandte ADRs

- [020 – Multi-Tenant Platform](./020-multi-tenant-platform.md)
- [023 – Tenant Routing](./023-tenant-routing.md)
- [024 – Tenant Data Model](./024-tenant-data-model.md)
