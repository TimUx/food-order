# ADR-023: Tenant Routing & Resolver

| Feld | Wert |
|------|------|
| **Status** | Accepted (Phase 0 – Architektur) |
| **Datum** | 2026-07-09 |
| **Version** | 2.0 |
| **Abhängigkeiten** | ADR-020, ADR-021, ADR-027 |

## Problem

Mandanten müssen über verschiedene URLs erreichbar sein. Ohne zentralen Resolver würde jede Schicht (Frontend-Router, API-Middleware, Module, Reverse Proxy) Hostnamen und Pfade eigenständig interpretieren.

## Motivation

Eine **einzige, zentrale Komponente** (`TenantResolver`) soll den Mandanten aus dem eingehenden HTTP-Request bestimmen und `TenantContext` befüllen. Alle anderen Komponenten vertrauen diesem Ergebnis.

## Entscheidung

### TenantResolver

**Geplante Implementierung** (`backend/src/platform/tenant/TenantResolver.ts`):

```typescript
interface ResolveResult {
  type: 'tenant' | 'platform' | 'unknown';
  tenant?: TenantContextData;
  matchedBy?: 'subdomain' | 'path_prefix' | 'custom_domain';
}

export class TenantResolver {
  resolve(req: Request): ResolveResult;
}
```

Der Resolver ist die **einzige** Stelle, die folgende Request-Eigenschaften auswertet:

- `Host` / `X-Forwarded-Host`
- Request-Pfad (für URL-Prefix-Modus)
- `PlatformSettings.baseDomain` und `allowedDomains`

### Routing-Varianten (v2.0)

| Priorität | Variante | Beispiel | TenantContext |
|-----------|----------|----------|---------------|
| 1 | **URL-Pfad auf App-Host** (primär) | `https://app.example.org/feuerwehr/public` | Ja (`feuerwehr`) |
| 2 | **Custom Domain** (zukünftig) | `https://bestellung.feuerwehr-xy.de` | Ja (nur Resolver anpassen) |
| – | **Landingpage** | `https://www.example.org` | Nein |
| – | **Plattform-Admin** | `https://app.example.org/platform` | Nein |

Subdomain-Routing (`https://verein.example.org`) wurde in v2.0 entfernt.

### Pfad-Auflösung (primär)

```
Request: Host = app.example.org, Path = /feuerwehr/public
  1. Host → App-Oberfläche
  2. Erster Pfadsegment = "feuerwehr"
  3. Lookup tenants.slug = "feuerwehr"
  4. Frontend basename = "/feuerwehr"
  5. API-Basis = "/feuerwehr/api"
  6. Setze TenantContext
```

**Reservierte Pfadsegmente** (kein Mandant): `platform`, `api`, `www`, `app`, …

### URL-Prefix-Auflösung

Standardmäßig aktiv (`PlatformSettings.pathPrefixRoutingEnabled = true`).

### Plattform-Routing

| Pfad | Beschreibung |
|------|--------------|
| `/` | Landing Page, ggf. Mandanten-Verzeichnis |
| `/platform/*` | Plattform-Administration |
| `/api/platform/*` | Plattform-API |
| `/api/health` | Globaler Health-Check (ohne Mandant) |

### Prioritätenkette

```
1. Ist Host eine Custom Domain?     → Custom-Domain-Lookup
2. Ist Host eine Mandanten-Subdomain? → Subdomain-Lookup
3. Ist pathPrefixRouting aktiv UND erster Segment bekannt? → Prefix-Lookup
4. Ist Host die Basis-Domain ohne Mandanten-Pfad? → Plattform
5. Sonst → 404 Tenant Not Found
```

### Resolver-Cache

| Aspekt | Wert |
|--------|------|
| Cache-Key | `host:firstPathSegment` (z. B. `localhost:feuerwehr`) |
| TTL | 60 Sekunden (positiv), 30 Sekunden (negativ) |
| Invalidierung | Bei Mandanten-Löschung (`PlatformTenantAdminService.delete` → `invalidateCache()`); bei Status-/Slug-Änderungen |
| Negative Cache | Unbekannte Slugs werden kurz gecacht; bei Mandanten-Pfaden (`/:slug/public`, `/:slug/api/…`) → `scope: unknown` |

### Unbekannte Mandanten-Pfade

Wenn der erste Pfadsegment wie ein Mandanten-Slug aussieht, der zweite ein Mandanten-Routen-Segment ist (`public`, `admin`, `service`, `api`, …) und kein Mandant existiert:

- `GET /api/public/routing-config?frontendPath=/{slug}/public` → `scope: "unknown"`
- Frontend zeigt `TenantNotFoundPage` („Veranstalter nicht gefunden“)

WWW-Routen mit einem Segment (`/mandant-beantragen`, `/funktionen`) fallen weiter auf `scope: www` zurück.

### Host-Header-Validierung

Der Resolver validiert den Host **vor** dem Lookup:

1. Host muss in `PlatformSettings.allowedDomains` enthalten sein
2. `X-Forwarded-Host` wird nur akzeptiert, wenn Request vom Reverse Proxy kommt (trusted proxy IPs)
3. Unbekannte Hosts → `400 Bad Request` (nicht 404, um Enumeration zu erschweren)

### Frontend-Routing (React)

| Regel | Beschreibung |
|-------|--------------|
| Kein Host-Parsing | `TenantProvider` lädt Daten vom Backend |
| Dynamisches `basename` | Nur bei URL-Prefix-Modus |
| Gleiche Routen pro Mandant | `/`, `/admin`, `/service` – Kontext kommt vom Resolver |

```
Mandant (Subdomain):
  asv-libelle.example.org/           → Bestellseite
  asv-libelle.example.org/admin      → Mandanten-Admin

Mandant (Prefix, optional):
  example.org/asv-libelle/           → Bestellseite
  example.org/asv-libelle/admin      → Mandanten-Admin

Plattform:
  example.org/                       → Landing
  example.org/platform               → Plattform-Admin
```

### WebSocket-Routing

Socket.IO-Verbindungen nutzen denselben Host wie HTTP:

- Subdomain: `asv-libelle.example.org` → Mandanten-Rooms
- Namespace-Empfehlung: `/tenant` mit Auth; Rooms `tenant:{id}:orders`
- Plattform-Monitoring (optional): separater Namespace `/platform`

## Alternativen

| Alternative | Bewertung |
|-------------|-----------|
| Nur Subdomain, kein Prefix | Einfacher, aber schlechter für Nutzer ohne DNS-Kontrolle → Prefix als Option |
| Mandant nur über Login-Auswahl | Kein Branding pro URL; schlechte UX → abgelehnt als Primärstrategie |
| Separates Frontend pro Mandant | Nicht skalierbar → abgelehnt |
| Query-Parameter `?tenant=slug` | Sicherheitsrisiko, nicht bookmarkbar → abgelehnt |

## Auswirkungen

- Traefik/nginx muss Wildcard-Subdomain und Forwarded Headers konfigurieren (ADR-027)
- DNS: `*.example.org` → Plattform-IP
- Frontend-Build bleibt einheitlich (kein Build pro Mandant)
- API-Tests: Default-Mandant oder expliziter `Host`-Header in supertest
- Bestehende Single-Tenant-URLs (`localhost:5173`) funktionieren über Default-Mandant-Fallback in Entwicklung

### Entwicklungsmodus

| Umgebung | Verhalten |
|----------|-----------|
| `localhost:5173` | Fallback auf Standard-Mandant (`slug: default`) |
| `CORS_ORIGIN` | Bleibt für lokale Entwicklung |
| Env `DEFAULT_TENANT_SLUG` | Optional für lokale Multi-Tenant-Tests |

## Risiken

| Risiko | Mitigation |
|--------|------------|
| Subdomain-Hijacking | Reservierte Namen; Validierung bei Anlage; Plattform-Admin-Freigabe |
| DNS-Fehlkonfiguration | Dokumentation; Health-Check pro Mandant |
| Prefix-Kollision mit Core-Routen | Reservierte Pfade (`platform`, `api`, `status`); Validierung bei Slug-Anlage |

## Performance

| Aspekt | Maßnahme |
|--------|----------|
| Resolver-Latenz | In-Memory-Cache; später Redis |
| DB-Lookup | Index auf `tenants.subdomain`, `tenants.slug` |
| Cold Start | PlatformSettings + Default-Mandant beim Boot preloaden |

## Spätere Erweiterungen

- Custom Domains mit automatischem TLS (Let's Encrypt per Mandant)
- Geo-Routing / CDN-Integration
- Mandanten-spezifische Redirects (z. B. `www` → Apex)
- A/B-Testing von Landing Pages pro Mandant

## Verwandte ADRs

- [020 – Multi-Tenant Platform](./020-multi-tenant-platform.md)
- [021 – Tenant Context](./021-tenant-context.md)
- [027 – Multi-Tenant Deployment](./027-multi-tenant-deployment.md)
