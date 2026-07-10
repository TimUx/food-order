# Canonical Domain Architecture – Abschlussbericht

## Ziel

Die Plattform ist vollständig **domainneutral**. Kein konkreter Produktions-Domainname ist im Quellcode hinterlegt. Die Struktur wird zentral über ENV/Docker konfiguriert.

## Endgültige Domainarchitektur

```
www.<platform-domain>     → Öffentliche Homepage (Marketing, FAQ, Bewerbung, Rechtliches)
app.<platform-domain>     → Plattformadministration (/platform)
<tenant>.<platform-domain> → Mandantenportal
```

**Lokal (localhost):** Pfadbasierte Trennung – `/` und Marketing-Pfade → WWW-Scope; `/platform/*` → APP-Scope.

## Routingübersicht

| Subdomain / Kontext | Scope | Oberfläche | Inhalt |
|---------------------|-------|------------|--------|
| `www` | `www` | Homepage | Landingpage, Funktionen, FAQ, Bewerbung |
| `app` | `app` | Plattform | Login, Mandantenverwaltung, Monitoring |
| `api`, `docs`, `status` (reserviert) | `app` | `reserved` | Plattformdienste (konfigurierbar) |
| beliebige andere Subdomain | `tenant` | Mandant | Bestellung, Admin, Küche, … |
| Apex-Domain | `www` | `apex` | Weiterleitung auf Homepage-Logik |
| unbekannter Mandant | `unknown` | – | 404 |

## Zentrale Dienste

| Dienst | Pfad |
|--------|------|
| `PlatformDomainService` | `backend/src/platform/PlatformDomainService.ts` |
| `PlatformSettingsService` | `backend/src/platform/tenant/PlatformSettingsService.ts` |
| `TenantResolver` | `backend/src/platform/tenant/TenantResolver.ts` |
| `TenantContext` / `PlatformContext` | `backend/src/platform/tenant/` |

## Domainkonfiguration (ENV)

| Variable | Default | Beschreibung |
|----------|---------|--------------|
| `PLATFORM_DOMAIN` | `localhost` | Basis-Domain |
| `WWW_SUBDOMAIN` | `www` | Homepage-Subdomain |
| `APP_SUBDOMAIN` | `app` | Plattform-Subdomain |
| `API_SUBDOMAIN` | `api` | API-Subdomain |
| `DOCS_SUBDOMAIN` | `docs` | Dokumentation (optional) |
| `STATUS_SUBDOMAIN` | `status` | Status (optional) |
| `PLATFORM_RESERVED_SUBDOMAINS` | – | Zusätzliche reservierte Namen |
| `PLATFORM_WWW_DOMAIN` / `PLATFORM_APP_DOMAIN` | – | Vollständige Host-Overrides |
| `COOKIE_DOMAIN` / `SESSION_DOMAIN` | – | Cookie-/Session-Domain |
| `ALLOWED_ORIGINS` / `PLATFORM_ALLOWED_ORIGINS` | – | CORS |
| `TRUSTED_PROXY_HOPS` / `TRUSTED_PROXY_IPS` | – | Reverse-Proxy |

## Reservierte Subdomains

Standard (über ENV erweiterbar):

- `www`
- `app`
- `api`
- `docs`
- `status`

Zusätzliche Namen: `PLATFORM_RESERVED_SUBDOMAINS=mail,cdn`

## Linkgenerierung

Alle URLs werden über `PlatformDomainService` erzeugt:

- `buildWwwUrl` – Homepage, Rechtliches, SEO
- `buildAppUrl` – Plattformlogin, Admin-Links
- `buildTenantUrl` – Mandanten-URLs, QR-Codes, E-Mails
- `buildApiUrl` – API-Endpunkte

## Plattformverwaltung

Unter **Plattform → Domain & Routing** (`/platform/domains`):

- Basis-Domain, WWW/APP-Domains, Wildcard
- API, Cookie, Session, CORS
- Reservierte Subdomains

Werte sind schreibgeschützt (nur Anzeige/Diagnose).

## Frontend

| Route-Set | Scope | Datei |
|-----------|-------|-------|
| `WwwRoutes` | `www` | `frontend/src/routes/WwwRoutes.tsx` |
| `AppRoutes` | `app` | `frontend/src/routes/AppRoutes.tsx` |
| `TenantRoutes` | `tenant` | `frontend/src/routes/TenantRoutes.tsx` |

`CanonicalRouteGuard` leitet Marketing-Pfade von `app` nach `www` und `/platform` von `www` nach `app` um.

## Tests

| Bereich | Dateien |
|---------|---------|
| Domain-Service | `backend/src/platform/PlatformDomainService.test.ts` |
| TenantResolver | `backend/src/platform/tenant/tenant.test.ts` |
| API | `tests/api/platformPublic.test.ts` |
| E2E | `tests/e2e/specs/canonical-routing.spec.ts`, `homepage.spec.ts` |
| Frontend | `frontend/src/types/routing.test.ts` |

## Auswirkungen auf Deployment und Docker

1. **DNS:** `www`, `app` und `*.platform-domain` auf die Plattform-IP zeigen lassen.
2. **TLS:** Wildcard-Zertifikat für Mandanten + Einzelhosts für `www` und `app` (oder SAN-Zertifikat).
3. **Traefik/Nginx:** Host-Rules für `www`, `app`, `*.domain` – keine festen Domainnamen in Config-Templates; Platzhalter `${PLATFORM_DOMAIN}` verwenden.
4. **ENV:** Beim Deployment `PLATFORM_DOMAIN`, Subdomain-Präfixe und `ALLOWED_ORIGINS` setzen – **keine Codeänderung** nötig.
5. **CORS:** `ALLOWED_ORIGINS` muss `https://www.<domain>` und `https://app.<domain>` enthalten.

## Akzeptanzkriterien

- [x] Plattform vollständig domainneutral
- [x] Keine hartcodierten Domains im Code
- [x] `www` → Homepage
- [x] `app` → Plattform
- [x] Wildcard → Mandanten
- [x] `TenantResolver` angepasst
- [x] `PlatformDomainService` implementiert
- [x] Linkgenerierung zentralisiert
- [x] Dokumentation aktualisiert
- [x] Tests erweitert
