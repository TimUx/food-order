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

### Routing-Varianten

| Priorität | Variante | Beispiel | TenantContext |
|-----------|----------|----------|---------------|
| 1 | **Subdomain** (primär) | `https://asv-libelle.festmanager.org` | Ja (`asv-libelle`) |
| 2 | **URL-Prefix** (optional) | `https://festmanager.org/asv-libelle` | Ja (`asv-libelle`) |
| 3 | **Custom Domain** (Phase 3) | `https://bestellung.feuerwehr-xy.de` | Ja (Mapping-Tabelle) |
| – | **Plattform** | `https://festmanager.org` | Nein |
| – | **Plattform-Admin** | `https://festmanager.org/platform` | Nein |

### Subdomain-Auflösung (primär)

```
Request: Host = asv-libelle.festmanager.org
  1. Extrahiere Subdomain: "asv-libelle"
  2. Validiere gegen PlatformSettings.baseDomain (Suffix-Match)
  3. Lookup tenants.subdomain = "asv-libelle" AND status = ACTIVE
  4. Setze TenantContext
```

**Reservierte Subdomains** (kein Mandant):

`www`, `api`, `admin`, `platform`, `status`, `mail`, `cdn`, `static`

### URL-Prefix-Auflösung (optional)

Aktivierbar über `PlatformSettings.pathPrefixRoutingEnabled`.

```
Request: Host = festmanager.org, Path = /asv-libelle/bestellung
  1. Erster Pfadsegment = "asv-libelle"
  2. Lookup tenants.slug = "asv-libelle"
  3. Strip Prefix für Frontend-Router: /bestellung
  4. Setze TenantContext
```

**Frontend-Anpassung:** React-Router erhält `basename="/asv-libelle"` dynamisch vom Backend (`GET /api/public/routing-config`).

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
| Cache-Key | `subdomain:{name}` oder `slug:{slug}` |
| TTL | 60 Sekunden (konfigurierbar) |
| Invalidierung | Bei Mandanten-Änderung (Status, Slug, Subdomain) |
| Backend | In-Memory (Phase 1); Redis (Phase 2) |
| Negative Cache | Unbekannte Subdomains 30s cachen (Schutz vor DB-Spam) |

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
| Gleiche Routen pro Mandant | `/`, `/admin`, `/mitarbeiter` – Kontext kommt vom Resolver |

```
Mandant (Subdomain):
  asv-libelle.festmanager.org/           → Bestellseite
  asv-libelle.festmanager.org/admin      → Mandanten-Admin

Mandant (Prefix, optional):
  festmanager.org/asv-libelle/           → Bestellseite
  festmanager.org/asv-libelle/admin      → Mandanten-Admin

Plattform:
  festmanager.org/                       → Landing
  festmanager.org/platform               → Plattform-Admin
```

### WebSocket-Routing

Socket.IO-Verbindungen nutzen denselben Host wie HTTP:

- Subdomain: `asv-libelle.festmanager.org` → Mandanten-Rooms
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
- DNS: `*.festmanager.org` → Plattform-IP
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
