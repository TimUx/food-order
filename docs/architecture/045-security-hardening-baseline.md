# ADR 045: Security Hardening Baseline

**Status:** Accepted  
**Datum:** 2026-07-10  
**Kontext:** Prompt 8 — OWASP-Risiken reduzieren, Defense in Depth

## Kontext

Phase-8-Härtung (ADR-029) adressierte Tenant-Isolation und Uploads. Produktionsfehlkonfigurationen (CORS-Wildcard, Default-Secrets, fehlende Impersonation-Audit-Ends) wurden erst zur Laufzeit oder gar nicht erkannt.

## Entscheidung

### Fail-fast in Produktion

Nach `bootstrapApp()` prüft `assertProductionCors()`:

- Kein `*` in `platform.network.corsOrigins`
- Mindestens eine explizite `https://`-Origin
- Wildcard-Subdomains nur mit HTTPS-Origin-Liste
- `PLATFORM_DOMAIN` nicht `localhost`

`assertProductionSecrets()` erweitert um `POSTGRES_PASSWORD`-Stärke.

### CORS Runtime

- Localhost nur in Development oder wenn explizit in Origins-Liste
- `*` in `socketOrigins()` in Produktion deaktiviert

### Security Headers

`createSecurityHeadersMiddleware()` (Helmet): CSP minimal für API, HSTS, `X-Frame-Options: deny`, `Referrer-Policy`.

### Uploads

- `assertUploadContentLength()` vor Multer (413 bei Überschreitung)
- Optional `UPLOAD_AV_HOOK=/pfad/scan.sh` vor Bildverarbeitung

### Impersonation

- Banner bleibt sichtbar; Ende ruft `POST /impersonation/end` auf → Audit `platform.tenant.impersonate.end`

## OWASP-Mapping

| OWASP 2021 | Maßnahme |
|------------|----------|
| A01 Broken Access Control | Impersonation-Audit Start+Ende, Tenant-Upload-Guards |
| A02 Cryptographic Failures | Secret-Rotation-Docs, Postgres-Passwort-Guard |
| A04 Insecure Design | Fail-fast Prod-Config |
| A05 Security Misconfiguration | CORS-Validierung, Security-Header-Baseline, QA-Scan |
| A08 Software/Data Integrity | Optional AV-Hook für Uploads |
| A09 Logging Failures | Impersonation-End-Audit verpflichtend (API) |

## Konsequenzen

- Produktionsstart schlägt fehl bei unsicherer CORS/Secrets-Konfiguration
- Admins müssen `platform.network.corsOrigins` mit HTTPS-URLs pflegen
- CI: `qa:security` + `tests/security/` prüfen Baseline-Dateien

## Akzeptanz

- `NODE_ENV=production` + localhost-only CORS → Serverstart abgebrochen
- Impersonation beenden → Audit-Eintrag `impersonate.end`
- `DRY_RUN`/Content-Length-Tests in CI grün
