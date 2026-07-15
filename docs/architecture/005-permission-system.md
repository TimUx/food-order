# ADR-005: Permission System

| Feld | Wert |
|------|------|
| **Status** | Accepted (implementiert) |
| **Datum** | 2026-07-08 |

## Ziel

Ein zweistufiges Berechtigungssystem: **Rollen** (ADMIN, STAFF) für Bereichszugang und **Modulberechtigungen** (`module.action`) für granulare Feature-Kontrolle – durchgängig in API und Admin-UI.

## Motivation

Module deklarieren Permissions in `module.json` (z. B. `payment.refund`, `printer.print`). Ohne zentrale Durchsetzung wachsen Sicherheitslücken mit jedem Modul. Die Plattform muss:

- Permission-Keys ausschließlich aus Modul-Manifesten ableiten (metadata-first)
- API-Routen und Admin-Menüs konsistent schützen
- STAFF-Rollen selektiv mit Modul-Rechten ausstatten können, ohne volle Admin-Rechte

## Architekturentscheidung

### Modell

```
User
  └── role: ADMIN | STAFF          ← Bereich & Basis-API
Role
  └── permissions: string[]        ← JSON-Array von Modul-Permission-Keys (primär STAFF)
```

`ADMIN` ist immer Superuser (`userHasPermission` → `true`). STAFF erhält effektive Rechte aus `Role.permissions` der zugewiesenen Rolle.

### Rollen-Matrix (Ist)

| Rolle | `/admin/*` | `/service/*` | Modul-Admin-APIs |
|-------|------------|------------------|------------------|
| ADMIN | ja | ja | ja (Superuser) |
| STAFF | nein | ja | nur mit zugewiesenen Permissions auf Modul-Routen |

### Modul-Permissions (deklariert & erzwungen)

| Modul | Permissions |
|-------|-------------|
| payment | `payment.view`, `payment.settings`, `payment.refund` |
| printer | `printer.settings`, `printer.print` |
| notifications | `notifications.settings`, `notifications.send` |
| inventory | `inventory.view`, `inventory.edit` |
| voucher | `voucher.manage`, `voucher.redeem` |

Nur Permissions **aktivierter Module** erscheinen im Katalog (`MetadataRegistry.aggregate` filtert wie Menüs/Widgets).

### Plattform-Komponenten

| Komponente | Datei | Verantwortung |
|------------|-------|---------------|
| `PermissionService` | `platform/PermissionService.ts` | Katalog, STAFF-Zuweisung, Audit |
| `parsePermissionKeys` / `userHasPermission` | `platform/PermissionService.ts` | Parsing & Prüflogik (wiederverwendbar) |
| `requirePermission` | `middleware/permission.ts` | API-Middleware-Kette |
| Core-Routes | `core/routes/permissions.ts` | `GET /api/admin/permissions`, `PUT .../staff` |

### Durchsetzung (Ist)

1. **Module-Source-of-Truth**: Permissions kommen ausschließlich aus `module.json` (`MetadataRegistry.resolvePermissions` ignoriert Runtime-`registerPermissions`).
2. **Rollenzuweisung**: `Role.permissions` (JSON array) – editierbar für `STAFF` über `UsersPage` / `PUT /api/admin/permissions/staff`. Validierung nur gegen module-deklarierte Keys.
3. **Middleware**: `requirePermission(permissionKey)` → `authenticate` → `loadUser` → `userHasPermission`. `ModuleManager` mounted automatisch `requirePermission`, wenn `requiredPermission` in `ModuleRouteRegistration` gesetzt ist.
4. **Auth-Payload**: Login und `/auth/me` liefern `permissions` aus der Rolle (frisch aus DB bei `loadUser`).
5. **Menüfilter**: `AdminLayout` nutzt `canAccessPermission()` / Modul-Menüs mit `requiredPermission`.

### API-Schutzbeispiel

```
POST /api/modules/features/payment/admin/refund
  → authenticate → loadUser → requirePermission('payment.refund')
```

## Vorteile

- Least-Privilege für Mitarbeiter (Vorbereitung für delegierte Modul-Administration)
- Module dokumentieren Berechtigungen maschinenlesbar
- Zentrale `PermissionService`-Logik statt duplizierter Parsing/Validierung in Routes

## Nachteile

- Komplexere Benutzerverwaltung
- Permissions pro Rolle, nicht pro User (feinere Granularität später)
- JWT enthält keine Permissions – `loadUser` ist für Permission-Checks erforderlich

## Alternativen

| Alternative | Bewertung |
|-------------|-----------|
| Nur ADMIN/STAFF | Zu grob für wachsende Module |
| RBAC mit Custom Roles | Flexibler, aber Admin-UI-Aufwand |
| `User.permissions` statt `Role.permissions` | Mehr Flexibilität, höherer UI-/Migrationsaufwand |
| OAuth/SSO mit externen Gruppen | Nicht für Zielgruppe Verein |

## Auswirkungen

- Prisma: `permissions Json` auf `Role` (STAFF) – `ADMIN` bleibt Superuser
- Core: `GET/PUT /api/admin/permissions` und `PUT /api/admin/permissions/staff`
- UI: `UsersPage` mit Permission-Matrix; `usePermission()` + `canAccessPermission()` im Frontend
- Payment: `payment.settings` / `payment.refund` auf Modul-Routen
- Audit: `permissions.staff.updated`

## Migrationsstrategie

| Phase | Maßnahme | Status |
|-------|-----------|--------|
| 1 | Prisma: `Role.permissions` + Seed | ✅ erledigt |
| 2 | `requirePermission` + ModuleManager-Integration | ✅ erledigt |
| 3 | Metadata-Source-of-Truth (`module.json` only, active modules) | ✅ erledigt |
| 4 | `PermissionService` + Core-Endpunkte | ✅ erledigt |
| 5 | Frontend `UsersPage`, `usePermission`, Menüfilter | ✅ erledigt |
| 6 | Beispielmodul Payment auf `requiredPermission` | ✅ erledigt |

## Offene Punkte

- Weitere Module müssen API-Aktionen per `requiredPermission` an `registerRoutes()` binden.
- `/admin/*` bleibt `requireRole('ADMIN')` – granulare Permissions greifen primär auf Modul-Routen unter `/api/modules/*`.
- Settings-API: namespace-spezifische Permission-Prüfung noch offen (siehe ADR-004).
- `GET /api/public/modules/menu` liefert Menüs ohne Auth – für Admin-Nav sollte langfristig ein authentifizierter Endpoint genutzt werden.
- Pro-User-Permissions (statt pro Rolle) bei Bedarf als Phase 2.
