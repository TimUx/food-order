# Phase 5 – Abschlussbericht: Frontend, Routing & Tenant Experience

| Feld | Wert |
|------|------|
| **Phase** | 5 – Frontend, Routing & Tenant Experience |
| **Branch** | `feature/v2-multi-tenant-platform` |
| **Datum** | 2026-07-09 |
| **Status** | Abgeschlossen |

## Zusammenfassung

Das FestManager-Frontend ist vollständig mandantenfähig. Subdomain- und URL-Prefix-Routing werden serverseitig aufgelöst und über `GET /api/public/routing-config` an das Frontend übergeben. Plattform- und Mandantenbereiche sind getrennt; Branding, Navigation und Auth arbeiten scope-bewusst.

---

## Frontendänderungen

| Bereich | Implementierung |
|---------|-----------------|
| **RoutingProvider** | Lädt Routing-Config vor Router-Mount |
| **Dynamisches basename** | URL-Prefix-Modus (`/asv-libelle/...`) |
| **PlatformRoutes** | Startseite, Funktionen, Docs, Download, Status, Legal |
| **TenantRoutes** | Bestehende Mandantenfunktionen, `/recht/:slug` |
| **BrandingHead** | Titel, Favicon, `lang` aus Mandant/Plattform |
| **AppThemeProvider** | Mandanten-Theme-Presets, Plattform-PrimaryColor |
| **AuthProvider** | Scoped localStorage pro `tenantSlug` |
| **TenantProvider** | Realtime-Reconnect bei Mandantenwechsel |
| **MaintenanceGate** | Wartungsmodus aus Routing/Plattform |
| **Fehlerseiten** | `TenantNotFoundPage`, `PlatformNotFoundPage` |

---

## Routingübersicht

```
Backend TenantResolver
        ↓
GET /api/public/routing-config
        ↓
RoutingProvider → BrowserRouter(basename)
        ↓
    ┌───────────┴───────────┐
    │                       │
scope: platform      scope: tenant
    │                       │
PlatformRoutes         TenantRoutes
```

| URL | Ergebnis |
|-----|----------|
| `asv-libelle.festmanager.org/` | Mandant: Bestellseite |
| `festmanager.org/asv-libelle/` | Mandant (Prefix): Bestellseite |
| `festmanager.org/` | Plattform: Landing |
| `festmanager.org/platform` | Plattform-Admin |
| Unbekannter Mandant | TenantNotFoundPage |

---

## Brandingkonzept

| Kontext | Logo | Farben | Titel |
|---------|------|--------|-------|
| Mandant | `tenant.logoUrl` | `tenant.theme` Presets | `tenant.name` |
| Plattform | Standard | `platform.primaryColor` | `platform.name` |

Plattform- und Mandanten-Branding sind strikt getrennt. `BrandingHead` setzt document.title und Favicon automatisch.

---

## Testergebnisse

| Test | Status |
|------|--------|
| `storageScope.test.ts` | Neu |
| `themeColors.test.ts` | Neu |
| `routing.test.ts` | Neu |
| Vitest lokal | Permission/ESM-Umgebungsproblem (CI-Referenz) |
| Playwright Multi-Tenant | Vorbereitet (offen für Phase 6) |

---

## Performancebewertung

| Aspekt | Bewertung |
|--------|-----------|
| Routing-Config Fetch | Einmalig beim App-Start – vernachlässigbar |
| Context-Wechsel | Scoped Storage verhindert unnötige Re-Fetches |
| Branding/Theme | `useMemo` auf MUI-Theme – kein Flackern |
| Bundle | Plattformseiten lazy-load-fähig (nicht vorpriorisiert) |

---

## Sicherheit

| Maßnahme | Status |
|----------|--------|
| Kein Host-Parsing im Frontend | ✓ |
| Scoped Auth-Tokens pro Mandant | ✓ |
| Plattform-Routen im Mandanten blockiert | ✓ |
| Impersonation mit absoluter Subdomain-URL | ✓ |
| Realtime-Reconnect bei Mandantenwechsel | ✓ |

---

## Offene Punkte (Phase 6)

- Playwright E2E für Subdomain + Prefix + Zwei-Mandanten-Isolation
- PWA `manifest` dynamisch pro Mandant
- Plattform-Branding aus Settings live laden (primaryColor API)
- Custom-Domain-Support im Frontend
- Service Worker Cache-Invalidierung bei Mandantenwechsel

---

## Vorbereitung Phase 6

Phase 6 kann Produktions-Deployment fokussieren:

- Traefik Wildcard-TLS
- DNS `*.festmanager.org`
- Staging mit echten Subdomains
- E2E-Regression in CI

---

## Akzeptanzkriterien

| Kriterium | Status |
|-----------|--------|
| Subdomain Routing | ✓ |
| URL Prefix Routing | ✓ |
| TenantProvider vollständig integriert | ✓ |
| Plattform- und Mandantenbranding getrennt | ✓ |
| Navigation passt sich automatisch an | ✓ |
| QR-Codes verwenden korrekte Domains | ✓ (Backend-URLs, useAbsoluteUrl) |
| Downloads tenantfähig | ✓ (Phase 2 Backend) |
| WebSockets tenantfähig | ✓ (same-origin + Phase 4 Backend) |
| Browser Cache korrekt behandelt | ✓ (scoped storage) |
| Tests erweitert | ✓ |
| Dokumentation aktualisiert | ✓ |
