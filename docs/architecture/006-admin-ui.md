# ADR-006: Admin UI

| Feld | Wert |
|------|------|
| **Status** | Accepted (implementiert) |
| **Datum** | 2026-07-08 |

## Ziel

Eine **metadata-first Admin-Oberfläche**, in der Module ausschließlich Metadaten registrieren und der Core daraus automatisch Navigation, Seiten, Formulare, Dashboard-Widgets und Health-Anzeigen erzeugt.

## Motivation

Früher waren Admin-Routen und Navigation im Frontend hardcodiert (`App.tsx`, `AdminLayout`, einzelne Settings-Seiten pro Modul). Das skaliert nicht:

- Jedes neue Modul erforderte Frontend-PRs für Menü und Settings-Seiten
- Payment hatte eine Sonderroute `/admin/module/payment`
- Dashboard-Kacheln und Widgets waren statisch

Mit Metadata-first entfallen modul-spezifische Admin-Routen im Frontend.

## Architekturentscheidung

### Prinzip

```
module.json (+ Core-Metadaten)
        ↓
MetadataRegistry / SettingsService / AdminUiService
        ↓
GET /api/admin/ui  →  AdminUiCatalog
        ↓
Frontend: AdminShell → DynamicAdminPage (pageType-Routing)
```

### Modul-Metadaten (Source of Truth)

Module deklarieren in `module.json`:

| Metadatum | Zweck |
|-----------|--------|
| `menus` | Navigationseinträge |
| `settings` | Formularfelder → Settings-Namespace |
| `widgets` | Dashboard-Widgets (`componentId`) |
| `healthChecks` | Health-Labels für Dashboard |
| `routes` | API-Mounts (Backend) |
| `permissions` | Berechtigungskatalog |
| `reports` | Report-Seiten (`componentId`) |
| `developerPages` | Developer/Debug-Seiten (`componentId`) |

Runtime-`registerMenus()` / `registerWidgets()` sind Fallback, wenn Manifest leer ist.

### Core-Metadaten

Der Core registriert Builtin-Seiten über `registerCoreAdminMetadata()` → `CoreAdminMetadataRegistry` (kein direkter Platform→Core-Import in `AdminUiService`).

- **Builtin-Seiten**: Benutzer, Veranstaltungen, Speisen, Module (`pageType: builtin|modules`)
- **Settings-Seiten**: Verein, Bestellung, E-Mail aus `CORE_SETTINGS_SCHEMAS`
- **Dashboard**: Kacheln aus allen Seiten + Mitarbeiterbereich-Link

### AdminUiService

`backend/src/platform/AdminUiService.ts` aggregiert:

- Core-Builtin-Pages
- Settings-Namespaces (`SettingsService.listNamespaces()`)
- Aktive Modul-Menüs, Widgets, Reports, Developer Pages, Health

API: `GET /api/admin/ui` (ADMIN-only)

### Frontend-Architektur

```
App.tsx
  └── /admin/* → AdminShell
        └── DynamicAdminPage (Pfad → pageType)
              ├── dashboard   → AdminDashboardPage (Kacheln + Widgets + Health)
              ├── settings    → GenericSettingsPage + DynamicSettingsForm
              ├── builtin     → BUILTIN_PAGE_COMPONENTS[componentId]
              ├── modules     → FeatureModulesPage
              ├── report      → REPORT_PAGE_COMPONENTS oder GenericReportPage
              └── developer   → DEVELOPER_PAGE_COMPONENTS oder GenericDeveloperPage
```

**Navigation:** `AdminLayout` liest `catalog.navigation` aus `useAdminUi()` – keine hardcodierten `coreNavItems`.

**Settings-Erweiterungen:** Spezial-UI (Logo-Upload, Payment-Provider-Test) über `SETTINGS_EXTENSIONS[namespace]` – optional, nicht in jedem Modul nötig.

**Optionale Custom-Settings-Seiten:** Wenn ein generisches Schema-Formular nicht ausreicht, registriert ein Modul eine eigene Seite in `frontend/src/admin/settingsPages.tsx`. `DynamicAdminPage` prüft die Registry vor `GenericSettingsPage`. Payment nutzt diese Variante.

**Widgets:** `WIDGET_COMPONENTS[componentId]` – z. B. `payment.status` im Payment-Modul.

### Seitentypen

| pageType | Renderer | Beispiel |
|----------|----------|----------|
| `dashboard` | `AdminDashboardPage` | `/admin` |
| `settings` | `GenericSettingsPage` | `/admin/verein`, `/admin/settings/module.payment` |
| `builtin` | Registry `core.users` etc. | `/admin/benutzer` |
| `modules` | `FeatureModulesPage` | `/admin/module` |
| `report` | Registry oder Generic | `/admin/payment`, `/admin/reports/{module}/{id}` |
| `developer` | Generic oder Registry | `/admin/developer/{module}/{id}` |

### Layout-Konventionen

- MUI 7, `AdminLayout` mit Drawer (260px)
- Icons aus Metadaten via `resolveAdminIcon()` (MUI-Icon-Namen)
- Permission-Filter: `canAccessPermission()` auf Nav und Seiten
- Legacy-Redirect: `/admin/module/payment` → `/admin/payment`
- Payment-Admin: dedizierte Report-Seite `payment.admin` unter `/admin/payment` (Tabs: Übersicht, Provider, Zahlungsarten, Einstellungen, …)

## Vorteile

- Neue Module: nur `module.json` + optional Widget/Extension-Registry-Eintrag
- Einheitliche Settings-UX über `DynamicSettingsForm`
- Dashboard zeigt Modul-Widgets und Health automatisch
- Keine Admin-Route mehr pro Modul in `App.tsx`

## Nachteile

- Komplexe CRUD-Seiten (Benutzer, Events) bleiben als **Builtin-Komponenten** im zentralen Registry – vollständig deklaratives CRUD ist nicht Ziel dieser Phase
- Settings-Erweiterungen (Upload, Provider-Test) benötigen weiterhin Frontend-Extension-Registry
- Kein Lazy Loading der Admin-Pages (Bundle-Größe)

## Alternativen

| Alternative | Bewertung |
|-------------|-----------|
| Hardcodierte Routes pro Modul | Nicht skalierbar (Ist, abgelöst) |
| Low-Code Admin Builder | Overkill |
| iframe-basierte Modul-UIs | Schlechte UX, Sicherheitsaufwand |

## Auswirkungen

- Entfernt: `ClubSettingsPage`, `OrderSettingsPage`, `MailSettingsPage`, `PaymentSettingsPage`
- `App.tsx`: nur `/admin/login` + `/admin/*`
- Payment: Widget + Health-Checks in `module.json`
- `useModuleMenuItems()` entfernt – Admin-Nav ausschließlich über `useAdminUi()` / `AdminUiProvider`
- `AdminUiProvider` invalidiert Cache bei Modul-Lifecycle-Änderungen

## Migrationsstrategie

| Phase | Maßnahme | Status |
|-------|-----------|--------|
| 1 | `GenericSettingsPage` + `DynamicSettingsForm` | ✅ |
| 2 | Payment-Admin-UI + generische Settings für API-Keys | ✅ |
| 3 | `AdminUiService` + `GET /admin/ui` | ✅ |
| 4 | Dynamisches Routing (`AdminShell`) | ✅ |
| 5 | Dashboard-Widgets + Health aus Metadaten | ✅ |
| 6 | Permission-Filter auf Nav | ✅ |
| 7 | Reports/Developer Pages (Generic + Registry) | ✅ |
| 8 | Funktionen-Tabelle (Status, Version, Konfigurieren) | ✅ |
| 9 | Custom Settings Page Registry | ✅ |

## Konsolidierungsreview (2026-07-09)

Siehe [ADR-006](./006-admin-ui.md) und [ADR-042](./042-volunteer-first-administration.md).

## Offene Punkte

- [ ] Lazy Loading (`React.lazy`) für Builtin-Pages
- [ ] Vollständig deklaratives CRUD (ohne Builtin-Registry)
- [ ] Modul-Reports/Developer-Pages mit echten Komponenten in Stub-Modulen
- [ ] Breadcrumbs für Modul-Hierarchie
- [ ] `GET /api/public/modules/menu` deprecaten zugunsten authentifizierter Admin-UI-API
