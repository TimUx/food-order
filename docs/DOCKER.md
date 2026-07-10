# Docker Guide – FestSchmiede

## Interaktiver Installer (v2.2.1)

Der empfohlene Weg zur Installation ist der TUI-Assistent:

```bash
./install.sh
```

Der Installer erzeugt automatisch `.env`, `installer/generated/compose.override.yml` und startet die passenden Compose-Dateien. Schema-Änderungen erfolgen per `prisma migrate deploy` (nicht `db push`). Siehe [INSTALLATION.md](./INSTALLATION.md).

### Online-Bootstrap

Ohne Git-Clone lädt `install.sh` das Release-Archiv von GitHub und entpackt es ins Zielverzeichnis:

```bash
curl -fsSL https://raw.githubusercontent.com/TimUx/FestSchmiede/v2.2.1/install.sh | bash
```

Nur Dateien herunterladen (ohne Wizard):

```bash
FESTSCHMIEDE_BOOTSTRAP_ONLY=1 curl -fsSL .../install.sh | bash
```

## Compose-Dateien

| Datei | Zweck |
|-------|-------|
| `docker-compose.yml` | Standard (lokal + Single-Node); Ports 3001/5173 |
| `docker-compose.prod.yml` | Overlay: Traefik, interne Netzwerke, Healthchecks |
| `docker-compose.ci.yml` | CI/QA mit Mailpit |
| `docker-stack.yml` | Docker Swarm (Secrets, Replicas) |

## Services

| Service | Image | Rolle |
|---------|-------|-------|
| **postgres** | postgres:16-alpine | Datenbank (alle Mandanten) |
| **backend** | ghcr.io/.../backend | API + Socket.IO |
| **frontend** | ghcr.io/.../frontend | nginx + SPA |
| **traefik** | traefik:v3.3 | Reverse Proxy (prod overlay) |
| **redis** | redis:7-alpine | Optional (`--profile redis`) |

## Volumes

| Volume | Mount | Inhalt |
|--------|-------|--------|
| `postgres_data` | `/var/lib/postgresql/data` | Datenbank |
| `uploads_data` | `/app/uploads` | Mandanten-Uploads |
| `letsencrypt_data` | `/letsencrypt` | TLS-Zertifikate |
| `redis_data` | `/data` | Redis AOF (optional) |

## Netzwerke (Produktion)

- `festschmiede_public` – Traefik + Frontend
- `festschmiede_internal` – Backend, Postgres (nicht routbar)

## Build

```bash
docker compose -f docker-compose.ci.yml build
```

## Umgebungsvariablen (Infrastruktur)

| Variable | Beschreibung |
|----------|--------------|
| `JWT_SECRET` | Token-Signierung |
| `APP_ENCRYPTION_KEY` | DB-Secret-Verschlüsselung |
| `DATABASE_URL` | PostgreSQL-Verbindung |
| `MULTI_TENANT_ENABLED` | Multi-Tenant aktivieren |
| `PLATFORM_DOMAIN` | Primäre Plattformdomain (ersetzt `PLATFORM_BASE_DOMAIN`) |
| `PLATFORM_BASE_DOMAIN` | Alias für `PLATFORM_DOMAIN` (Abwärtskompatibilität) |
| `PLATFORM_WWW_DOMAIN` | WWW-Domain (Default: `www.<PLATFORM_DOMAIN>`) |
| `PLATFORM_WILDCARD_DOMAIN` | Wildcard-Pattern (Default: `*.<PLATFORM_DOMAIN>`) |
| `PLATFORM_API_DOMAIN` | Optionale API-Domain |
| `PLATFORM_ALLOWED_ORIGINS` | CORS-Origins (kommagetrennt) |
| `PLATFORM_COOKIE_DOMAIN` | Cookie-Domain (optional) |
| `PLATFORM_SESSION_DOMAIN` | Session-Domain (optional) |
| `TRUSTED_PROXY_HOPS` | Proxy-Hops für Express |
| `ACME_EMAIL` | Let's Encrypt (Traefik) |
| `LOG_FORMAT` | `text` oder `json` |
| `REDIS_URL` | Optional, Vorbereitung |

**Nicht in Docker:** fachliche Einstellungen (SMTP, Zahlung, …) → Admin-UI.

## Healthchecks

Alle Services in `docker-compose.yml` und `docker-compose.prod.yml` haben Healthchecks.

Backend-Image enthält `HEALTHCHECK` Instruction.

## Redis (optional)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile redis up -d
```

Vorbereitung für Resolver-Cache und Socket.IO-Adapter (Phase 7+).
