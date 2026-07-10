# Release Notes — FestManager 2.0.0

**Datum:** 2026-07-09  
**Codename:** Multi-Tenant Platform

---

## Neu

- **Multi-Tenant-Architektur:** Mehrere Veranstalter auf einer Installation mit vollständiger Datenisolation (`tenantId`).
- **Plattformadministration:** Dashboard, Mandantenverwaltung, Monitoring und globale Einstellungen unter `/platform`.
- **Tenant-Routing:** Subdomain (`{slug}.domain`) und Pfad-Präfix (`/t/{slug}`) mit mandantenspezifischem Branding.
- **Mandantenfähige Module:** Payment, Notifications, Legal und Printer mit tenant-scoped Konfiguration.
- **Mandanten-Benachrichtigungen:** Eigener SMTP, Branding in E-Mail-Templates, Delivery-Logging.
- **Performance-Monitoring:** Erweiterte Health-Checks, Slow-Request-Logging, Platform-Monitoring-UI.

## Verbessert

- **Sicherheit:** Tenant-Isolation in APIs, JWT, Uploads und WebSockets; Host-Validation; erweiterte Rate Limits.
- **Performance:** Datenbank-Indizes, k6-Lasttests (bis 250 VUs), Frontend Code Splitting.
- **Deployment:** Docker Compose mit Traefik, Wildcard-TLS, Resource Limits.
- **Dokumentation:** 10 Phase-Abschlussberichte, ADRs 020–030, Deployment- und Performance-Guides.

## Optimiert

- Composite-Indizes für Bestellungen und Realtime-Aggregate.
- Lazy-loaded Frontend-Routes (Staff, Admin, Platform).
- Vite `manualChunks` für kleinere initiale Bundles.

## Architektur

- `TenantContext` / `PlatformContext` für Request-Scoping.
- `ModuleManager` mit mandantenfähigem Lifecycle.
- Shared Database mit `tenantWhere()` für alle Datenzugriffe.
- EventBus, SettingsService und Permission-System tenant-aware.

## Multi-Tenant

| Feature | Beschreibung |
|---------|--------------|
| Routing | Subdomain oder Pfad-Präfix |
| Branding | Logo, Farben, Name pro Mandant |
| Settings | Plattform- vs. Mandanteneinstellungen |
| Migration | Automatische Migration bestehender Daten |

## Plattform

- Mandanten anlegen, aktivieren, deaktivieren.
- Impersonation für Support (mit Session-Validierung).
- System-Monitoring (CPU, Memory, DB-Latenz, WebSocket-Stats).

## Module

Alle offiziellen Module sind mandantenfähig:

| Modul | Status |
|-------|--------|
| Online-Zahlung | ✅ Tenant-aware |
| Benachrichtigungen | ✅ Tenant-aware |
| Rechtliche Informationen | ✅ Tenant-aware |
| Bondruck | ✅ Tenant-aware |

## Docker

- Multi-Service Compose mit nginx, backend, frontend, postgres, traefik.
- Wildcard-Zertifikate für Subdomain-Routing.
- Resource Limits für Produktionsbetrieb.

## Performance

- k6-Szenarien: `order_load` (100 VUs), `mixed_users` (250 VUs), `realtime_poll` (30 VUs).
- Baseline-Vergleich via `npm run qa:performance`.
- SharedCache-Interface für zukünftige Redis-Integration.

## Security

- JWT enthält `tenantId`; Cross-Tenant-Tokens abgewiesen.
- Upload-IDOR-Schutz via `uploadAccess` Middleware.
- WebSocket-Räume: `tenant:{id}:…`
- `PLATFORM_ADMIN_PASSWORD` Pflicht in Produktion.

## Dokumentation

- [README](../README.md), [CHANGELOG](../CHANGELOG.md), [ROADMAP](ROADMAP.md)
- [Architecture Guide](architecture/README.md) mit ADRs 001–030
- [Deployment Guide](DEPLOYMENT_GUIDE.md), [Performance Guide](architecture/PERFORMANCE_GUIDE.md)
- [Security Policy](../SECURITY.md)

## Upgrade von 1.5.x

1. Backup erstellen (`scripts/backup.sh`).
2. Docker Images auf `2.0.0` aktualisieren.
3. `docker compose up -d` — Schema-Migration läuft automatisch.
4. Default-Mandant wird aus bestehenden Daten erstellt.
5. Plattformadmin-Passwort setzen: `PLATFORM_ADMIN_PASSWORD`.

## Bekannte Einschränkungen

- Screenshots zeigen weiterhin Single-Tenant-Demo-UI (Regeneration optional).
- Redis-Adapter für horizontale Socket.IO-Skalierung noch nicht implementiert (Interface vorhanden).
- Vorschau-Module (Lager, Gutscheine) nicht in Admin-UI sichtbar.
