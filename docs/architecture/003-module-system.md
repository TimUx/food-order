# ADR-003: Module System

| Feld | Wert |
|------|------|
| **Status** | Accepted (implementiert in `backend/src/platform/`) |
| **Datum** | 2026-07-08 |

## Ziel

Eine vollständige Modulverwaltung bereitstellen: Lifecycle, Versionierung, Migrationen, Abhängigkeiten, Health Checks und Admin-UI. Offizielle Module liegen im Docker-Image (`modules/`) – keine Runtime-Downloads.

## Motivation

Vereine sollen Features optional aktivieren (Zahlung, Druck, Gutscheine), ohne den Core zu verändern. Ein formales Modulsystem mit Manifest, DB-Status und Admin-UI verhindert Ad-hoc-Feature-Flags und ermöglicht kontrollierte Upgrades beim Image-Deploy.

## Architekturentscheidung

### Komponenten

```
modules/{id}/module.json  →  ModuleDiscovery  →  ModuleLoader  →  ModuleRegistry
                                                                      ↓
                                                        platform/ModuleManager
                                                                      ↓
              install / enable / disable / upgrade / healthCheck / initialize / shutdown
                                                                      ↓
              ModuleMigrationService (SQL aus modules/{id}/migrations/)
                                                                      ↓
              MetadataRegistry → Menüs, Widgets, Permissions, Settings (metadata-first)
                                                                      ↓
                    Routes, Hooks, Extension Points (via ExtensionPointRegistry)
```

Implementierung: `backend/src/platform/` – `backend/src/module-system/` re-exportiert abwärtskompatibel.

### Lifecycle-Status

| Status | Bedeutung | DB `installed` | DB `enabled` | `lifecycleStatus` | Ressourcen aktiv |
|--------|-----------|------------------|--------------|-------------------|------------------|
| AVAILABLE | Im Image, nicht installiert | false | false | – | nein |
| INSTALLED | Installiert, nicht aktiv | true | false | – | nein |
| ENABLED | Aktiv | true | true | – | ja |
| DISABLED | Deaktiviert (war aktiv) | true | false | – | nein |
| UPGRADING | Upgrade läuft | true | variabel | UPGRADING | nein (temporär) |
| FAILED | Letzter Lifecycle-Schritt fehlgeschlagen | true | variabel | FAILED | nein |

`deriveModuleStatus()` in `ModuleRegistry` leitet den sichtbaren Status aus DB-Feldern ab.

### Lifecycle-Methoden

| Methode | Verantwortung |
|---------|---------------|
| `install()` | Modul-spezifische Erstinstallation; danach `ModuleMigrationService` |
| `enable()` / `activate()` | `initialize()` + `enable()` + Hooks/Routes/Menüs |
| `disable()` / `deactivate()` | `disable()` + `shutdown()` + Hook-Cleanup |
| `upgrade()` | Versionswechsel; Migrationen; optional Re-Init bei aktivem Modul |
| `healthCheck()` | Modul-spezifische Gesundheitsprüfung |
| `initialize()` | Laufzeit-Setup (Services, Config-Defaults) |
| `shutdown()` | Ressourcen freigeben |

`ModuleManager.upgradeModule()` setzt `UPGRADING`, führt `upgrade()` + Migrationen aus, aktualisiert `moduleVersion`/`imageVersion` und reaktiviert bei Bedarf.

### Versionierung & Docker-Updates

- `module.json` → `version` = Version im aktuellen Docker-Image (`imageVersion` in DB)
- `moduleVersion` in DB = zuletzt installierte/upgegradete Version
- `upgradeAvailable` wenn `imageVersion > moduleVersion`
- Beim Image-Deploy sind neuere Module-Versionen automatisch verfügbar; Upgrade wird explizit im Admin ausgelöst (kein Auto-Upgrade beim Boot)

### Migrationen

- SQL-Dateien: `modules/{id}/migrations/*.sql` (im Image, keine Downloads)
- `ModuleMigrationService` führt fehlende Migrationen aus und protokolliert in `module_migrations`
- `schemaVersion` in `InstalledModule` spiegelt letzte angewendete Migration

### Abhängigkeiten

- `dependencies.required` / `dependencies.optional` im Manifest
- `DependencyResolver.checkRequiredActivated()` vor Aktivierung
- Admin-UI zeigt `dependencyStatus` (erfüllt / fehlend / inaktiv)

### Manifest (`module.json`)

Pflichtfelder: `id`, `name`, `version`, `entry`, `dependencies`, `permissions`, `minimumCoreVersion`.

Optional (metadata-first): `menus`, `widgets`, `routes`, `settings` mit `fields[]`.

`settings.fields` registriert Modul-Einstellungen über `SettingsService` / `SchemaRegistry`.

### Modul-Interface

Jedes Modul implementiert: `install`, `uninstall`, `initialize`, `shutdown`, `enable`, `disable`, `upgrade`, `healthCheck`, `registerRoutes`, `registerHooks`, `registerMenus`, `registerWidgets`, `registerPermissions`.

Optional: `getConfigContract()` mit Zod.

### DB-Modell

`InstalledModule`: `moduleId`, `moduleVersion`, `imageVersion`, `installed`, `enabled`, `configJson`, Health-Felder, `everInstalled`, `everActivated`, `lifecycleStatus`, `lastError`, `schemaVersion`.

`ModuleMigration`: `moduleId`, `migration`, `appliedAt`.

`PlatformAuditLog`: Lifecycle-Events (`module.installed`, `module.enabled`, `module.upgraded`, …).

### Admin-API & UI

- API: `/api/admin/modules/*` (`core/routes/modules.ts`)
  - `POST /:id/install`, `/activate`, `/deactivate`, `/upgrade`, `/enable`, `/disable`
  - `GET/PUT /:id/config`, `GET /:id/health`
- UI: **Administration → Module** (`FeatureModulesPage`)
  - Spalten: Version, Status, Health, Abhängigkeiten
  - Aktionen: Installieren, Aktivieren, Deaktivieren, Upgrade, Konfigurieren, Health Check

### Route-Mounting

- Modul-Features: `/api/modules/features/{moduleId}/*` mit Aktivierungs-Guard
- Konfigurations-Routen (`requireActivation: false`): gemountet bei **Installation**, z. B. SMTP-Test vor Aktivierung

### Discovery-Pfade

| Umgebung | Pfad |
|----------|------|
| Entwicklung | `MODULES_DIR` → `backend/modules` |
| Produktion | `/app/modules` + `MODULES_DIST_DIR` → `dist/modules` |
| Community (Zukunft) | `PLUGINS_DIR` → `/app/plugins` (nicht geladen) |

## Vorteile

- Kein Runtime-Download – sicher und reproduzierbar
- Explizites Upgrade mit `UPGRADING`/`FAILED`-Transparenz
- Zentrale SQL-Migrationen mit Tracking
- Abhängigkeitsprüfung vor Aktivierung
- Deaktiviert = keine Menüs, keine Payment-Checkout-URLs

## Nachteile

- Module importieren Core per relativem Pfad – enge Kopplung
- Express-Router werden bei Deaktivierung nicht unmounted (Guard → 404)
- 9 Stubs erhöhen Discovery-Overhead ohne Nutzen
- Doppelter Import-Pfad (`platform/` vs. `module-system/`) während Übergangsphase

## Alternativen

| Alternative | Bewertung |
|-------------|-----------|
| npm-Pakete pro Modul | Komplexeres Version-Management für Vereine |
| Auto-Upgrade beim Boot | Weniger Admin-Kontrolle bei Breaking Changes |
| Feature-Flags ohne Lifecycle | Kein Install/Upgrade/Health |

## Auswirkungen

- Dockerfile kopiert `modules/` ins Image
- Prisma-Migration für `lifecycle_status`, `last_error`, `schema_version`, `image_version`, `module_migrations`
- Admin-UI: erweiterte `FeatureModulesPage`

## Migrationsstrategie

| Schritt | Aktion | Status |
|---------|--------|--------|
| 1 | Legacy `backend/src/features/` löschen | ✅ erledigt |
| 2 | `ACTIVATED` → `ENABLED`, `UPGRADING`/`FAILED` | ✅ erledigt |
| 3 | `ModuleMigrationService` + Tracking-Tabelle | ✅ erledigt |
| 4 | Route-Unmount bei `deactivateModule()` | offen |
| 5 | Stub-Module aus Discovery ausblenden | ✅ `productionReady` + Admin-Filter |

## Konsolidierungsreview (2026-07-09)

Siehe [ADR-003](./003-module-system.md) und [ADR-041](./041-module-api-v3.md).

| Kritikpunkt | Entscheidung |
|-------------|--------------|
| Lifecycle zu komplex für Admins | UX abstrahiert; Backend unverändert |
| Stub-Module sichtbar | `productionReady: false`, nur payment/notifications/printer in UI |
| Core-Kopplung per relativem Import | Akzeptabel für mitgelieferte Module; dokumentiert |
| Plugin-Isolation | Bewusst nicht Ziel für 1.0 |

## Offene Punkte

- [ ] Modul-Signierung für Community-Plugins
- [ ] Hot-Reload in Entwicklung
- [ ] `activate`/`deactivate` API vs. `enable`/`disable` konsolidieren
