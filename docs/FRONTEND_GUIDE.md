# Frontend Guide – Multi-Tenant Routing & UX

Technische Dokumentation für das mandantenfähige FestManager-Frontend (Phase 5).

## Kernprinzip

**Das Frontend wertet niemals Hostname oder URL selbst aus.** Die Mandantenerkennung erfolgt serverseitig über den `TenantResolver`. Das Frontend lädt die Routing-Konfiguration über:

```
GET /api/public/routing-config
```

## Provider-Hierarchie

```
RoutingProvider          ← scope, basename, tenantSlug (von API)
  BrowserRouter          ← dynamisches basename (URL-Prefix-Modus)
    PlatformProvider     ← Plattformdaten (/api/public/platform)
      TenantProvider     ← Mandantendaten (/api/public/tenant)
        AppThemeProvider ← Branding aus Mandant/Plattform
          AuthProvider   ← mandantenbezogene Token-Speicherung
```

## Hooks

| Hook | Verwendung |
|------|------------|
| `useRouting()` | Scope, basename, URLs, Wartungsmodus |
| `useTenant()` | Mandanten-Branding, Locale, Währung |
| `usePlatform()` | Plattformname, Version, Wartung |
| `useAbsoluteUrl()` | Absolute URLs für QR/Impersonation |
| `useClub()` | Legacy-Adapter → `useTenant()` |

## Routing-Varianten

| Modus | Beispiel | `basename` |
|-------|----------|------------|
| Subdomain (primär) | `asv-libelle.festmanager.org/admin` | `""` |
| URL-Prefix (optional) | `festmanager.org/asv-libelle/admin` | `/asv-libelle` |
| Plattform | `festmanager.org/platform` | `""` |
| Lokal | `localhost:5173` | `""` (Default-Mandant) |

## Routen

### Plattform (`scope: platform`)

- `/` – Startseite
- `/funktionen`, `/dokumentation`, `/download`, `/plattform-status`
- `/impressum`, `/datenschutz`
- `/platform/*` – Plattform-Administration

### Mandant (`scope: tenant`)

- `/` – Bestellseite
- `/recht/:slug` – Rechtliche Seiten (Impressum, Datenschutz, …)
- `/mitarbeiter/*`, `/admin/*` – Mitarbeiter & Administration
- `/platform/*` → Redirect `/` (keine Plattformfunktionen im Mandanten)

## Branding

| Bereich | Quelle |
|---------|--------|
| Mandanten-Logo, Name | `useTenant()` |
| Mandanten-Farben | `tenant.theme` → Theme-Presets |
| Plattform-Farben | `platform.primaryColor` |
| Seitentitel, Favicon | `BrandingHead` |
| Sprache (`lang`) | Mandant → Plattform-Default |

## Auth & Speicher

Tokens werden mandantenbezogen in `localStorage` gespeichert:

```
verein_token:{tenantSlug}
verein_refresh_token:{tenantSlug}
```

Plattform-Tokens bleiben global (`fm_platform_token`).

## Realtime

Bei Mandantenwechsel (`tenantSlug` ändert sich):

1. `realtimeService.disconnect()`
2. Neu verbinden (same-origin, Backend ordnet Rooms per Host zu)

## Verboten

```typescript
// ❌ Niemals in Komponenten
window.location.hostname
window.location.pathname  // für Mandantenerkennung

// ✅ Stattdessen
const { routing } = useRouting();
const { tenant } = useTenant();
```

## Tests

- `storageScope.test.ts` – Token-Isolation
- `themeColors.test.ts` – Branding-Auflösung
- `routing.test.ts` – Default-Konfiguration

## Verwandte Dokumentation

- [ADR-023: Tenant Routing](architecture/023-tenant-routing.md)
- [Phase-5-Report](architecture/PHASE_5_COMPLETION_REPORT.md)
- [Developer Guide](DEVELOPER_GUIDE.md)
