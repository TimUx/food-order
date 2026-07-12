# ADR-027: Multi-Tenant Deployment

| Feld | Wert |
|------|------|
| **Status** | Accepted (aktualisiert v2.0.0) |
| **Datum** | 2026-07-12 |
| **Version** | 2.0 |
| **Abhängigkeiten** | ADR-020, ADR-023, ADR-025, ADR-026 |

## Problem

Multi-Tenant-Betrieb erfordert klare Host-Trennung (Landingpage vs. App), TLS, korrekte Forwarded Headers und mandantenisolierte Uploads — ohne Wildcard-Zertifikate oder dynamische Traefik-Router.

## Entscheidung (v2.0.0): Pfad-basiertes Mandanten-Routing

Mandanten sind **ausschließlich** unter dem App-Host per URL-Pfad erreichbar:

- Landingpage: `https://www.example.org`
- Plattform: `https://app.example.org/platform`
- Mandant: `https://app.example.org/<tenant>/public`

**Keine** Mandanten-Subdomains, **keine** `HostRegexp`, **keine** Wildcard-Zertifikate.

### Vorteile

- Nur zwei TLS-Zertifikate (www + app)
- Keine DNS-Challenge, kein Wildcard-DNS
- Keine dynamischen Traefik-Router
- Reverse-Proxy-agnostisch (Traefik, nginx, Caddy, HAProxy)
- Einfacheres Self-Hosting und weniger Supportaufwand

### Ziel-Deployment-Architektur

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Reverse Proxy (Traefik / nginx / Caddy)                     │
│  - Host www → Frontend (Marketing)                           │
│  - Host app → Frontend + Backend (Plattform + Mandanten)     │
│  - Per-Host TLS (certresolver=le)                            │
└──────────────┬──────────────────────────────────────────────┘
               ▼
        ┌─────────────┐        ┌─────────────┐
        │  Frontend   │        │  Backend    │
        │  nginx:80   │        │  Node:3001  │
        └─────────────┘        └──────┬──────┘
                                      ▼
                               ┌─────────────┐
                               │ PostgreSQL  │
                               └─────────────┘
```

### DNS

| Eintrag | Typ | Zweck |
|---------|-----|-------|
| `www.example.org` | A/AAAA | Öffentliche Website (optional) |
| `app.example.org` | A/AAAA | Plattform + alle Mandanten |

Kein `*.example.org` nötig.

### Traefik-Labels (Installer-generiert)

```yaml
labels:
  - traefik.http.routers.festschmiede.rule=Host(`www.example.org`) || Host(`app.example.org`)
  - traefik.http.routers.festschmiede.entrypoints=websecure
  - traefik.http.routers.festschmiede.tls=true
  - traefik.http.routers.festschmiede.tls.certresolver=le
```

**Nicht verwenden:** `tls.domains`, `HostRegexp`, Wildcard-SAN.

### API-Routing

| Bereich | Pfad |
|---------|------|
| Plattform | `/api/platform/…` |
| Mandant | `/<tenant>/api/…` |

Die zentrale `TenantResolver`-Middleware ist die einzige Stelle für Host- und Pfad-Auswertung.

### Installer-Konfiguration (.env)

```env
PLATFORM_DOMAIN=example.org
ENABLE_WWW_HOST=yes
ENABLE_APP_HOST=yes
TRAEFIK_ROUTER_RULE=Host(`www.example.org`) || Host(`app.example.org`)
TRAEFIK_CERT_RESOLVER=le
MULTI_TENANT_ENABLED=true
PLATFORM_ALLOWED_ORIGINS=https://www.example.org,https://app.example.org
```

### Migration bestehender Installationen

1. Installer-Update ausführen → `stack.yml` / Override ohne `HostRegexp` regenerieren
2. Backend startet `migratePathRoutingV20` (Pfad-Routing aktivieren)
3. Gespeicherte Links: `https://tenant.example.org` → `https://app.example.org/tenant/public`
4. QR-Codes und E-Mail-Vorlagen nutzen `resolveTenantPublicBaseUrl()` (pfad-basiert)

## Konsequenzen

- Bestehende Mandanten-Subdomain-URLs funktionieren nicht mehr ohne Redirect auf dem alten Proxy
- `tenants.subdomain` bleibt als internes Feld (meist identisch mit `slug`), wird aber nicht mehr für Routing verwendet
- Zukünftige eigene Domains pro Mandant erfordern nur Anpassungen am `TenantResolver`
