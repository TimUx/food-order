# Domain-Abstraktion – Abschlussbericht

## Ziel

Die Plattform darf an keiner Stelle fest auf `festmanager.org` implementiert sein. Alle Domains sind zentral über ENV/Docker konfigurierbar.

## Neue Domain-Architektur

**Zentrale Komponente:** `backend/src/platform/PlatformDomainService.ts`

| Funktion | Beschreibung |
|----------|--------------|
| `loadDomainConfigFromEnv()` | Lädt Domain-Konfiguration aus ENV |
| `buildPlatformUrl()` | Apex-Plattform-URLs |
| `buildWwwUrl()` | Homepage-URLs |
| `buildTenantUrl()` | Mandanten-Subdomain-URLs |
| `buildApiUrl()` | API-URLs |
| `applyDomainConfigToPlatformContext()` | Wendet ENV auf Plattformkontext an |

### ENV-Variablen (Infrastruktur)

| Variable | Beschreibung | Default (Dev) |
|----------|--------------|---------------|
| `PLATFORM_DOMAIN` | Primäre Plattformdomain | `localhost` |
| `PLATFORM_BASE_DOMAIN` | Alias (Abwärtskompatibilität) | – |
| `PLATFORM_WWW_DOMAIN` | WWW-Domain | `www.<DOMAIN>` |
| `PLATFORM_WILDCARD_DOMAIN` | Wildcard | `*.<DOMAIN>` |
| `PLATFORM_API_DOMAIN` | API (optional) | – |
| `PLATFORM_ALLOWED_ORIGINS` | CORS | Dev-Origins |
| `PLATFORM_COOKIE_DOMAIN` | Cookie-Domain | – |
| `PLATFORM_SESSION_DOMAIN` | Session-Domain | – |

## Ersetzte Domainreferenzen (Code)

| Bereich | Änderung |
|---------|----------|
| `backend/src/config/index.ts` | Default `localhost` statt `festmanager.org` |
| `DEFAULT_PLATFORM_CONTEXT` | `localhost` / `*.localhost` |
| `TenantResolver` | WWW-Domain als Plattform-Host |
| `tenantController` | `platformUrl`, `wwwUrl`, `apiUrl`, `domains` in Routing-API |
| `ImpersonationService` | Dynamische Redirect-URLs |
| `notificationTenantContext` | Dynamische E-Mail-Basis-URLs |
| `smtpResolver` | `noreply@<PLATFORM_DOMAIN>` |
| `frontend/types/routing.ts` | Keine hardcodierte Produktionsdomain |
| `frontend/types/tenant.ts` | Default `localhost` |
| `PlatformApplyPage` | Dynamischer Subdomain-Hinweis |
| `BrandingHead` | Canonical aus Routing-Konfiguration |
| `useAbsoluteUrl` | WWW-URL auf Plattform-Scope |
| Docker Compose/Stack/Prod | ENV-basierte Traefik-Regeln |

## Plattformverwaltung

- **Neue Seite:** `/platform/domains` – schreibgeschützte Anzeige der aktiven Domain-Konfiguration
- **API:** `GET /api/platform/domains`

## Betroffene Komponenten

- TenantResolver, Routing-API, Notifications, Impersonation
- Homepage (SEO Canonical, Links)
- Bewerbungsportal (Subdomain-Hilfetext)
- CORS-Policy, Bootstrap, Docker/Traefik

## Dokumentation

Aktualisiert: `README.md`, `DEPLOYMENT.md`, `DOCKER.md`, `ADMIN_GUIDE.md`, `DEVELOPER_GUIDE.md`

Hinweis: `festmanager.org` in älteren ADRs/Phase-Reports ist ein **Beispiel-Platzhalter**.

## Tests

| Test | Datei |
|------|-------|
| PlatformDomainService Unit | `backend/src/platform/PlatformDomainService.test.ts` |
| CORS mit example.test | `backend/src/middleware/corsPolicy.test.ts` |
| TenantResolver example.test | `backend/src/platform/tenant/tenant.test.ts` |
| Routing API Domains | `tests/api/platformPublic.test.ts` |
| Frontend Routing Defaults | `frontend/src/types/routing.test.ts` |
