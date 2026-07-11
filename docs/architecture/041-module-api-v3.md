# ADR 041: Module API v3

## Status

Accepted (v2.2.2)

## Kontext

Die Modul-Runtime existierte parallel in `backend/src/platform/` (Implementierung) und `backend/src/module-system/` (Re-Exports pro Datei). Module importierten uneinheitlich `module-system/types`, `platform/extension-points` und `platform/bootstrap`. Stub-Module waren über `productionReady: false` versteckt, ohne explizites Preview-Konzept.

## Entscheidung

### Kanonische Runtime: `platform/`

| Schicht | Pfad | Verantwortung |
|---------|------|---------------|
| Runtime | `platform/ModuleManager`, `ModuleRegistry`, … | Discovery, Lifecycle, Routes, Settings |
| Modul-API | `platform/module-api.ts` | **Ein** Import für Modulentwickler |
| Deprecated | `module-system/index.ts` | Nur Re-Export-Fassade, keine eigene Logik |

### Manifest v3 (vereinfacht)

Pflichtfelder unverändert (`id`, `name`, `version`, `entry`, …). Neu:

- `preview: true` – Modul nur mit `SHOW_PREVIEW_MODULES=1` discoverbar/admin-sichtbar
- `productionReady: true` impliziert `preview: false` (Abwärtskompatibilität)

### Preview-Stubs

Stub-Module (`inventory`, `voucher`, …) tragen `preview: true`. Discovery und Admin-Liste filtern sie standardmäßig aus.

### Import-Regel für Module

```typescript
import { BaseModule, CORE_HOOKS, paymentServiceRegistry, type FeatureContext } from '../../src/platform/module-api';
```

## Breaking Changes

| Änderung | Migration |
|----------|-----------|
| `module-system/types` etc. | `platform/module-api` |
| Tiefe `module-system/*`-Imports | `module-system` (deprecated) oder `platform` |
| Preview-Stubs nicht mehr in Discovery | `SHOW_PREVIEW_MODULES=1` setzen |
| `productionReady`-Filter in Admin | Ersetzt durch `preview`-Semantik (äquivalent) |

## Konsequenzen

- Keine doppelte Registry-Logik – eine Implementierung in `platform/`
- `module-system/` kann nach SDK-Migration (ADR-010) entfernt werden
- Community-Plugins: `ModuleLoader` löst Einträge auch unter `PLUGINS_DIR` auf

## Referenzen

- ADR-003 (Module System), ADR-010 (Developer SDK)
- `docs/DEVELOPER_GUIDE.md`, `docs/architecture/003-module-system.md`
- `backend/src/platform/module-api.ts`
