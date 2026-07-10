# ADR-027: Multi-Tenant Deployment

| Feld | Wert |
|------|------|
| **Status** | Accepted (Phase 0 – Architektur) |
| **Datum** | 2026-07-09 |
| **Version** | 2.0 |
| **Abhängigkeiten** | ADR-020, ADR-023, ADR-025, ADR-026 |

## Problem

Das aktuelle Docker-Setup (`docker-compose.yml`) ist für Single-Tenant mit fester `CORS_ORIGIN` und ohne Wildcard-DNS ausgelegt. Multi-Tenant-Betrieb erfordert Wildcard-Subdomains, TLS, korrekte Forwarded Headers und mandantenisolierte Uploads.

## Motivation

Die Plattform soll mit minimalem Mehraufwand für Vereine betreibbar bleiben – aber gleichzeitig beliebig viele Mandanten-Subdomains unterstützen.

## Entscheidung

### Ziel-Deployment-Architektur

```
Internet
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Traefik (Reverse Proxy)                                     │
│  - Wildcard TLS (*.festmanager.org)                          │
│  - HTTP → HTTPS Redirect                                     │
│  - Forwarded Headers (X-Forwarded-Host, Proto, For)          │
│  - Rate Limiting (optional)                                  │
└──────────────┬──────────────────────┬───────────────────────┘
               │                      │
               ▼                      ▼
        ┌─────────────┐        ┌─────────────┐
        │  Frontend   │        │  Backend    │
        │  nginx:80   │        │  Node:3001  │
        │  (SPA)      │        │  + Socket.IO│
        └─────────────┘        └──────┬──────┘
                                      │
                                      ▼
                               ┌─────────────┐
                               │ PostgreSQL  │
                               │ 16          │
                               └─────────────┘

Volumes:
  postgres_data    → /var/lib/postgresql/data
  uploads_data     → /app/uploads/{tenantId}/...
```

### DNS

| Eintrag | Typ | Ziel |
|---------|-----|------|
| `festmanager.org` | A/AAAA | Server-IP |
| `*.festmanager.org` | A/AAAA | Server-IP (Wildcard) |

### Traefik-Konfiguration (Konzept)

```yaml
# docker-compose.yml Ergänzung
services:
  traefik:
    image: traefik:v3
    command:
      - --providers.docker=true
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.letsencrypt.acme.tlschallenge=true
      - --certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}
      - --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - letsencrypt_data:/letsencrypt

  frontend:
    labels:
      - traefik.http.routers.frontend.rule=Host(`festmanager.org`) || HostRegexp(`{subdomain:[a-z0-9-]+}.festmanager.org`)
      - traefik.http.routers.frontend.tls.certresolver=letsencrypt
      - traefik.http.routers.frontend.tls.domains[0].main=festmanager.org
      - traefik.http.routers.frontend.tls.domains[0].sans=*.festmanager.org

  backend:
    labels:
      - traefik.http.routers.backend.rule=(Host(`festmanager.org`) || HostRegexp(`{subdomain:[a-z0-9-]+}.festmanager.org`)) && PathPrefix(`/api`, `/socket.io`)
```

### Wildcard TLS

| Aspekt | Strategie |
|--------|-----------|
| Zertifikat | Let's Encrypt mit DNS-01 oder TLS-ALPN Challenge |
| Wildcard | `*.festmanager.org` + `festmanager.org` in einem Zertifikat |
| Renewal | Traefik automatisch |
| Entwicklung | mkcert oder selbstsigniert für `*.localhost` |

### Forwarded Headers

Backend vertraut Forwarded Headers nur von Traefik:

```env
TRUSTED_PROXY_IPS=172.16.0.0/12,10.0.0.0/8
```

Express:

```typescript
app.set('trust proxy', trustedProxyCount);
// TenantResolver liest req.hostname (von Express korrekt aufgelöst)
```

| Header | Verwendung |
|--------|------------|
| `X-Forwarded-Host` | Mandanten-Subdomain-Auflösung |
| `X-Forwarded-Proto` | HTTPS-Erkennung, Secure-Cookies |
| `X-Forwarded-For` | Rate Limiting, Audit |

### Container-Änderungen

| Service | Änderung |
|---------|----------|
| **traefik** | Neu; terminierender Proxy |
| **frontend** | Keine externen Ports in Produktion (nur über Traefik) |
| **backend** | `TRUSTED_PROXY_IPS`; dynamische CORS; kein `CORS_ORIGIN` Fixwert |
| **postgres** | Unverändert (intern) |
| **redis** (optional, Phase 2) | Resolver-Cache, Socket.IO Adapter |

### Volumes

| Volume | Zweck | Multi-Tenant |
|--------|-------|--------------|
| `postgres_data` | Datenbank | Alle Mandanten (Shared DB) |
| `uploads_data` | Datei-Uploads | Unterverzeichnisse pro `tenant_id` |
| `letsencrypt_data` | TLS-Zertifikate | Plattformweit |

**Upload-Migration:** Bestehende Dateien in `/uploads/default/` verschieben.

### Health Checks

| Check | Endpoint | Scope |
|-------|----------|-------|
| Backend | `GET /api/health` | Plattform (DB, Module) |
| Plattform-Admin | `GET /api/platform/health` | Detailliert |
| Mandant | `GET /api/public/health` | Mit TenantContext |
| Postgres | `pg_isready` | Unverändert |
| Traefik | `ping` | Optional |

Docker Compose Healthchecks bleiben; Traefik leitet nur zu healthy Backends.

### Environment Variables

| Variable | Ebene | Beschreibung |
|----------|-------|--------------|
| `DATABASE_URL` | Infrastruktur | Unverändert |
| `JWT_SECRET` | Infrastruktur | Unverändert |
| `APP_ENCRYPTION_KEY` | Infrastruktur | Unverändert |
| `TRUSTED_PROXY_IPS` | Infrastruktur | **Neu** |
| `ACME_EMAIL` | Infrastruktur | **Neu** (Traefik) |
| `CORS_ORIGIN` | Deprecated | Fallback Dev; Produktion aus PlatformSettings |
| `DEFAULT_TENANT_SLUG` | Dev | Fallback für localhost |
| `MULTI_TENANT_ENABLED` | Feature-Flag | Schrittweise Aktivierung |

### CORS im Deployment

- Entwicklung: `CORS_ORIGIN=http://localhost:5173` (bestehend)
- Produktion: Dynamisch aus `PlatformSettings` (ADR-026)
- Traefik sendet korrekte `Origin` an Backend

### Performance

| Komponente | Maßnahme | Phase |
|------------|----------|-------|
| TenantResolver | In-Memory-Cache (60s TTL) | 1 |
| PlatformSettings | Cache beim Boot + Invalidierung | 1 |
| Datenbank | Indizes auf `tenant_id` | 1 |
| Socket.IO | Rooms mit Tenant-Präfix | 1 |
| Redis | Resolver-Cache, Socket.IO Adapter | 2 |
| CDN | Statische Assets (`frontend`) | 3 |

### WebSockets hinter Traefik

```yaml
# Traefik Labels für WebSocket
- traefik.http.services.backend.loadbalancer.server.port=3001
# Sticky Sessions optional für Socket.IO ohne Redis Adapter
```

Mit Redis Adapter (Phase 2): Keine Sticky Sessions nötig.

### CI/CD

| Aspekt | Änderung |
|--------|----------|
| GitHub Actions | Unverändert (Image-Build) |
| Tests | Kein Wildcard-DNS in CI; `DEFAULT_TENANT_SLUG=default` |
| Staging | Wildcard-DNS auf Staging-Server empfohlen |

### Single-Tenant-Abwärtskompatibilität

Bestehende Installationen ohne Wildcard-DNS:

1. `MULTI_TENANT_ENABLED=false` oder Default-Mandant-Fallback
2. Weiterhin `localhost:5173` / eigene Domain ohne Subdomain
3. Migration erzeugt Standard-Mandant; Resolver mappt alle Requests darauf
4. Schrittweise Aktivierung wenn DNS bereit

## Ist-Analyse (docker-compose.yml)

| Aspekt | Ist | Soll |
|--------|-----|------|
| Reverse Proxy | Extern (manuell) | Traefik im Compose (empfohlen) |
| TLS | Manuell | Wildcard Let's Encrypt |
| CORS | `CORS_ORIGIN` Fixwert | Dynamisch |
| Uploads | `/app/uploads` flach | `/app/uploads/{tenantId}/` |
| Ports | 5173, 3001 exponiert | Nur 80/443 (Traefik) |
| Health | postgres + implizit | Explizit für alle Services |

## Alternativen

| Alternative | Bewertung |
|-------------|-----------|
| nginx statt Traefik | Bewährt; weniger Docker-native Labels → Traefik bevorzugt für Compose |
| Caddy | Einfacheres TLS; weniger Wildcard-Erfahrung in Doku → Traefik |
| Separates Image pro Mandant | Nicht skalierbar → abgelehnt |
| Kubernetes | Overkill für Vereins-Deployment → Phase 4+ optional |

## Auswirkungen

- OPERATIONS.md und ADMIN_GUIDE erhalten Traefik-Anleitung
- `.env.example` ergänzt um `TRUSTED_PROXY_IPS`, `ACME_EMAIL`
- Produktions-Deployment benötigt Wildcard-DNS
- Upload-Pfade ändern sich (Migration)
- `CORS_ORIGIN` wird deprecated

## Risiken

| Risiko | Mitigation |
|--------|------------|
| Let's Encrypt Rate Limits | Staging-Zertifikat testen; DNS vorher korrekt |
| Wildcard-DNS nicht möglich | URL-Prefix-Fallback (ADR-023) |
| Traefik-Misconfiguration | Beispiel-Compose in Repo; Validierung |
| Upload-Volume volllaufen | Quota pro Mandant (Phase 3); Monitoring |

## Spätere Erweiterungen

- Redis-Service im Compose
- Horizontal Scaling (mehrere Backend-Replicas)
- Object Storage (S3/MinIO) statt lokaler Uploads
- Geo-Distributed Deployment
- Custom Domain TLS per Mandant

## Verwandte ADRs

- [020 – Multi-Tenant Platform](./020-multi-tenant-platform.md)
- [023 – Tenant Routing](./023-tenant-routing.md)
- [025 – Platform Settings](./025-platform-settings.md)
- [026 – Multi-Tenant Security](./026-multi-tenant-security.md)
