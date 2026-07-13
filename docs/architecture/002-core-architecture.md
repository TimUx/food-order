# ADR-002: Core Architecture

| Feld | Wert |
|------|------|
| **Status** | Accepted (implementiert) |
| **Datum** | 2026-07-08 |

## Ziel

Den Core als stabile, modulare Plattform definieren. Der Core kennt ausschließlich **Module**, **Services**, **Registries** und **Events** – keine konkreten Feature-Implementierungen.

Module registrieren **Metadaten** (`module.json`); die Plattform erzeugt daraus automatisch Menüs, Routen, Widgets, Einstellungen und Berechtigungen.

## Motivation

- Optionale Features ohne Regression für Barzahlungs-Vereine
- Testbare Geschäftslogik in Core-Domänen (Bestellungen, Events, Speisen)
- Neue Module ohne Core-Umbau (Tickets, Spenden, …)
- Einheitliche Lifecycle-, Health- und Audit-Infrastruktur

## Architekturentscheidung

### Schichtenmodell (Backend)

```
HTTP Request
    ↓
routes/index.ts          ← Routing, Middleware-Kette
    ↓
controllers/             ← Request/Response, dünn
    ↓
services/                ← Geschäftslogik, Hooks, Socket-Events
    ↓
repositories/ + Prisma   ← Datenzugriff
```

### Plattform-Schicht (`backend/src/platform/`)

| Komponente | Datei | Verantwortung |
|------------|-------|---------------|
| `ServiceContainer` | `ServiceContainer.ts` | Dependency Injection, `PLATFORM_TOKENS` |
| `EventBus` | `EventBus.ts` | Generisches Pub/Sub |
| `HookSystem` | `HookSystem.ts` | Domänen-Hooks auf EventBus (`CORE_HOOKS`) |
| `Registry` | `Registry.ts` | Generisches Registry-Pattern |
| `ExtensionPointRegistry` | `ExtensionPointRegistry.ts` | Zentrale Extension Points |
| `MetadataRegistry` | `MetadataRegistry.ts` | Metadata-first: Manifest → UI/API |
| `ModuleRegistry` | `ModuleRegistry.ts` | Registrierte Module + aggregierte Metadaten |
| `ModuleDiscovery` | `ModuleDiscovery.ts` | Scan von `/modules`, `/plugins` |
| `ModuleLoader` | `ModuleLoader.ts` | Dynamisches Laden von Modul-Entrypoints |
| `ModuleManager` | `ModuleManager.ts` | Lifecycle: install/activate/deactivate/upgrade |
| `DependencyResolver` | `DependencyResolver.ts` | Modul-Abhängigkeiten |
| `HealthService` | `HealthService.ts` | Health Checks, Persistenz in `InstalledModule` |
| `AuditService` | `AuditService.ts` | Audit-Log (`PlatformAuditLog`) |
| `FeatureContext` | `FeatureContext.ts` | Kontext für Module (hooks, flags, audit, settings) |
| `SettingsService` | `platform/settings/` | Einheitliche Einstellungen (Core + Module) |
| `PermissionService` | `PermissionService.ts` | Permission-Katalog, STAFF-Zuweisung, Audit |
| `AdminUiService` | `AdminUiService.ts` | Metadata-first Admin-Katalog (Nav, Pages, Widgets) |
| `CoreAdminMetadataRegistry` | `adminUi/CoreAdminMetadataRegistry.ts` | Core-Admin-Metadaten (injiziert vom Core) |
| `bootstrapPlatform()` | `bootstrap.ts` | Wiring aller Singletons |

**Abwärtskompatibilität:** `backend/src/module-system/` re-exportiert die Plattform für bestehende Imports.

### Core-Domänen

| Domäne | Service | Verantwortung |
|--------|---------|---------------|
| Bestellungen | `orderService` | Online/Kassen-Bestellungen, Status, Küchen-Freigabe |
| Veranstaltungen | `eventService` | Events, Aktiv-Schalter, Mehrfach-Aktivierung |
| Speisen | `foodItemService` | Mandanten-Katalog + Zuordnung pro Event (`EventFoodItem`) |
| Verein | `clubService` | Branding, SMTP, Bestell-Einstellungen |
| Auth | `authService` | JWT, Login |
| E-Mail | `emailService` | Bestätigungen (Core, nicht Modul) |

### Extension Points

| Extension Point | Registry | Zugriff im Core |
|-----------------|----------|-----------------|
| `payableResource` | `payableResourceRegistry` | `core/extensionPoints.ts` → `getPayableResourceRegistry()` |
| `paymentService` | `paymentServiceRegistry` | `core/extensionPoints.ts` → `getPaymentServiceRegistry()` |
| Domänen-Hooks | `HookSystem` / `featureHooks` | Direkt via `module-system` (Alias) |

Core-Registrierung: `registerCorePayables()` in `core/payable/registerPayables.ts`.

### Metadata-first (`module.json`)

Module deklarieren in `module.json`:

- `permissions` – Berechtigungen
- `menus` – Admin-Navigation
- `widgets` – Dashboard-Widgets
- `routes` – Route-Metadaten (Mount, Webhook, Public)
- `settings` – Admin-Pfad, Config-Key

`MetadataRegistry` bevorzugt Manifest-Einträge; `registerMenus()` / `registerPermissions()` im Modul-Code sind Fallback.

Beispiel: `backend/modules/payment/module.json`

### Core-Prinzipien

1. **Core fragt, Module antworten** – z. B. `paymentServiceRegistry.isAvailable()`
2. **Keine Provider im Core** – Stripe nur im Payment-Modul
3. **Hooks statt direkter Imports** – Module abonnieren `ORDER_CREATED`, nicht `orderService`
4. **Metadata-first** – UI und Berechtigungen aus Manifest, nicht hardcodiert im Core
5. **Minimale Core-Änderungen** – neue Features als Module

### Modul-Lifecycle

```
discover (module.json)
  → register (ModuleRegistry)
  → install → initialize → enable (activate)
  → disable → shutdown → uninstall
```

Lifecycle-Events: `MODULE_INSTALLED`, `MODULE_ACTIVATED`, `MODULE_DEACTIVATED`, `MODULE_UPGRADED` (HookSystem).

Audit: `module.installed`, `module.enabled`, `module.deactivated`, `module.upgraded`, `module.config.updated`.

### Bootstrap-Reihenfolge

```
index.ts
  → bootstrapApp()
      → bootstrapPlatform()      // DI, Registries, ModuleManager
      → registerCorePayables()   // Core-Adapter an Extension Point
      → moduleManager.initialize()
      → moduleManager.mountRoutes()
  → initSocket()
  → listen()
```

## Vorteile

- Klare Trennung: Plattform vs. Domäne vs. Module
- Payment-Deaktivierung = identisches Verhalten wie vor Modul-Einführung
- PayableResource erlaubt spätere Ressourcen ohne Payment-Änderung
- Automatische UI-Metadaten aus Manifesten
- Zentrales Audit und Health Monitoring

## Nachteile

- Zwei Import-Pfade (`platform/` und `module-system/`) während der Migration
- Services rufen teils dynamisch Extension-Registries auf
- Repository-Schicht inkonsistent (nur `clubRepository` extrahiert)
- `PlatformAuditLog` erfordert DB-Migration

## Alternativen

| Alternative | Bewertung |
|-------------|-----------|
| Alles im Core belassen | Würde Zahlung an alle Vereine binden |
| Vollständige Hexagonal-Architektur | Overhead für aktuelle Teamgröße |
| Event Sourcing | Nicht nötig für Vereins-Use-Case |
| Runtime-Registrierung statt Manifest | Weniger deklarativ, schwerer für Admin-UI |

## Auswirkungen

- Neue domänenübergreifende Integration → Extension Point in `ExtensionPointRegistry`
- `orderService` enthält Payment-Gate (`filterReleasedIds`, `skipKitchenNotify`)
- Legacy `backend/src/features/` entfernt (Duplikat zu `backend/modules/`)
- Tests: `platform.test.ts`, `module-system.test.ts`

## Implementierungsstatus

| Komponente | Status |
|------------|--------|
| ModuleManager | ✅ `platform/ModuleManager.ts` |
| ServiceContainer / DI | ✅ |
| EventBus | ✅ |
| HookSystem | ✅ |
| ExtensionPointRegistry | ✅ |
| MetadataRegistry | ✅ |
| Module Discovery / Loader | ✅ |
| HealthService | ✅ |
| AuditService | ✅ |
| Prisma `PlatformAuditLog` | ✅ Schema + `AuditService` |
| Core → Extension Points | ✅ `core/extensionPoints.ts` |
| Settings Platform (ADR-004) | ✅ `SettingsService`, SchemaRegistry |
| Permission Platform (ADR-005) | ✅ `PermissionService`, `requirePermission` |
| Admin UI Platform (ADR-006) | ✅ `AdminUiService`, `CoreAdminMetadataRegistry` |
| Payment metadata-first | ✅ `module.json` |
| Payment Module (ADR-007) | ✅ Stripe + PayableResource + Modul-Migrationen |
| Notification Module (ADR-008) | ✅ SMTP, ntfy, Discord, Slack, Teams |
| Printing Module (ADR-009) | ✅ ESC/POS, PDF, Browser, Discovery |

## Offene Punkte

- [ ] Soll `emailService` ins Notifications-Modul wandern?
- [ ] Einheitliche Fehlercodes/API-Response-Envelope
- [ ] Route-Unmount bei Deaktivierung (aktuell: Guard → 404)
- [ ] Frontend: Widgets vollständig aus MetadataRegistry speisen
