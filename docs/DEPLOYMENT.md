# Deployment Guide – FestManager Multi-Tenant

Anleitung für den produktiven Betrieb der mandantenfähigen FestManager-Plattform.

> Siehe auch: [DOCKER.md](DOCKER.md), [ADR-027](architecture/027-multi-tenant-deployment.md), [Phase-6-Report](architecture/PHASE_6_COMPLETION_REPORT.md)

## Übersicht

```
Internet → Traefik (TLS, Wildcard) → Frontend (nginx) → Backend → PostgreSQL
                                              ↘ Socket.IO /uploads /api
```

## Voraussetzungen

| Anforderung | Beschreibung |
|-------------|--------------|
| **DNS** | `<PLATFORM_DOMAIN>` + `*.<PLATFORM_DOMAIN>` → Server-IP (Beispiel: `plattform.de`) |
| **Ports** | 80, 443 (Produktion mit Traefik) |
| **Docker** | Compose v2 oder Swarm |
| **Secrets** | `JWT_SECRET`, `APP_ENCRYPTION_KEY`, DB-Passwort |

## Schnellstart (lokal / Single-Node)

```bash
cp .env.example .env
# JWT_SECRET und APP_ENCRYPTION_KEY setzen
docker compose up -d
```

Erreichbar unter `http://localhost:5173` (Frontend) und `http://localhost:3001/api/health`.

## Produktion mit Traefik (Wildcard-TLS)

```bash
cp .env.example .env
```

Wichtige Variablen:

```env
ACME_EMAIL=admin@example.test
PLATFORM_DOMAIN=plattform.de
PLATFORM_WWW_DOMAIN=www.plattform.de
PLATFORM_WILDCARD_DOMAIN=*.plattform.de
MULTI_TENANT_ENABLED=true
JWT_SECRET=<64+ Zeichen zufällig>
APP_ENCRYPTION_KEY=<32+ Zeichen>
TRUSTED_PROXY_HOPS=2
LOG_FORMAT=json
```

> **Hinweis:** In älteren Dokumenten und ADRs erscheint `festmanager.org` als **Beispieldomain**. Die Plattform verwendet ausschließlich die konfigurierte `PLATFORM_DOMAIN`.

Start:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Nur Ports **80** und **443** sind extern erreichbar.

### TLS-Varianten

| Variante | Beschreibung |
|----------|--------------|
| **Let's Encrypt (TLS-ALPN)** | Standard in `docker-compose.prod.yml`; Wildcard via SAN `*.domain` |
| **Let's Encrypt (DNS-01)** | Für reine Wildcard-Zertifikate; Traefik-Resolver auf DNS-Provider umstellen |
| **Eigene Zertifikate** | Zertifikat in Traefik-File-Provider oder Volume mounten |

### CORS

Produktion: dynamisch über Plattformsettings `platform.network.corsOrigins` + automatische Wildcard-Subdomains.

Entwicklung: `CORS_ORIGIN=http://localhost:5173` als Fallback.

## Docker Swarm

```bash
echo "$JWT_SECRET" | docker secret create festmanager_jwt_secret -
echo "$POSTGRES_PASSWORD" | docker secret create festmanager_db_password -
docker stack deploy -c docker-stack.yml festmanager
```

## Health Checks

| Endpoint | Scope |
|----------|-------|
| `GET /api/health` | Plattform (DB, Resolver, Tenant-Infra) |
| `GET /api/public/health` | Mit TenantContext (Subdomain/Prefix) |
| `GET /api/platform/health` | Plattform-Admin (auth) |

## Uploads

Struktur: `uploads/{tenantId}/dateiname.ext`

Migration alter flacher Uploads:

```bash
./scripts/migrate-uploads-tenant.sh default
```

## Backups (Strategie)

| Komponente | Methode |
|------------|---------|
| **PostgreSQL** | `pg_dump` / Volume-Snapshot |
| **Uploads** | Volume `uploads_data` sichern |
| **TLS** | Volume `letsencrypt_data` |
| **Konfiguration** | `.env` + Plattformsettings-Export |
| **Mandant** | Plattform-API Export (Vorbereitung) |

Restore: dokumentiert, vollständige Automatisierung folgt in späterer Phase.

## Entwicklung mit Subdomains

`/etc/hosts` oder dnsmasq:

```
127.0.0.1 plattform.local
127.0.0.1 asv-libelle.plattform.local
```

```env
PLATFORM_DOMAIN=plattform.local
MULTI_TENANT_ENABLED=true
CORS_ORIGIN=http://plattform.local:5173
```

Frontend mit Vite-Proxy oder Traefik lokal testen.

## Monitoring (Vorbereitung)

Erweiterungspunkte für Prometheus/OpenTelemetry:

- Structured JSON logs (`LOG_FORMAT=json`)
- `X-Request-Id` Response-Header
- `/api/health` für Load-Balancer-Probes

## Sicherheit

- Postgres nur intern (`expose`, kein `ports` in Produktion)
- `TRUSTED_PROXY_HOPS` korrekt setzen (Traefik + nginx = 2)
- Host-Validierung im `TenantResolver`
- Container als non-root User (`app`)
