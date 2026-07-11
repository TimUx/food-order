# ADR-010: Developer SDK

| Feld | Wert |
|------|------|
| **Status** | Proposed |
| **Datum** | 2026-07-08 |

## Ziel

Ein Developer SDK bereitstellen, mit dem Modul-Autoren und Integratoren die Plattform erweitern können – ohne tiefe Kenntnis der Core-Codebase und ohne relative `../../src/...`-Imports.

## Motivation

Aktuelle Module importieren Core direkt:

```typescript
import { paymentServiceRegistry } from '../../src/module-system/extension-points';
```

Das erschwert:

- Community-Plugins aus `/app/plugins`
- unabhängige Modul-Entwicklung und Test
- API-Stabilität zwischen Core-Versionen
- Frontend-Modul-Erweiterungen

Ein SDK definiert die **öffentliche Vertragsfläche** des Cores.

## Architekturentscheidung

### SDK-Schichten

```
┌─────────────────────────────────────────┐
│  @vereinsbestellung/module-sdk (npm)    │
│  - Types (Module, PayableResource, ...) │
│  - BaseModule, createStubModule         │
│  - Hook-Namen, Permission-Helpers       │
│  - Test-Utilities (mock FeatureContext) │
└─────────────────────────────────────────┘
                    ↓ importiert von
┌─────────────────────────────────────────┐
│  Module (payment, printer, ...)         │
└─────────────────────────────────────────┘
                    ↓ zur Laufzeit
┌─────────────────────────────────────────┐
│  Core (ModuleManager, Extension Points)│
└─────────────────────────────────────────┘
```

### Paket-Inhalt (Vorschlag)

| Export | Beschreibung |
|--------|--------------|
| `BaseModule` | Abstrakte Modul-Basisklasse |
| `CORE_HOOKS` | Hook-Konstanten |
| `PayableResource`, `PayableResourceAdapter` | Payment-Integration |
| `PaymentProvider` | Provider-Interface (Payment-Modul re-export) |
| `FeatureContext` | Typ für Config-Zugriff |
| `createStubModule()` | Stub-Generator |
| `defineModuleConfig(schema)` | Zod-Helper |
| `testing.createMockContext()` | Vitest-Helper |

### Frontend SDK (optional)

| Export | Beschreibung |
|--------|--------------|
| `registerAdminPage(moduleId, component)` | Dynamische Admin-Route |
| `useModuleConfig(moduleId)` | Config laden |
| `ModuleSettingsForm` | Generisches Formular aus Schema |

### Versionierung

- SDK-Version gekoppelt an `minimumCoreVersion` in `module.json`
- Semver: Breaking SDK = Major, Core prüft Kompatibilität bei Discovery

### Community-Plugins

1. Plugin als npm-Paket oder Ordner in `PLUGINS_DIR`
2. `module.json` + kompiliertes JS
3. Core lädt nur signierte/verifizierte Plugins (Zukunft)

### Dokumentation im SDK

- Getting Started: „Erstes Modul in 15 Minuten“
- Extension-Point-Katalog
- Beispielmodul `hello-world`
- Stripe-Provider als Referenz (im Hauptrepo)

## Vorteile

- Stabile API-Grenze
- Module testbar ohne Full-Stack
- Community-Ökosystem möglich
- IDE-Autovervollständigung für Modul-Autoren

## Nachteile

- Zusätzliches Paket zu pflegen
- Sync zwischen SDK und Core bei Änderungen
- Build-Pipeline für externe Module

## Alternativen

| Alternative | Bewertung |
|-------------|-----------|
| Relative Imports beibehalten | Einfach, aber nicht skalierbar |
| Monorepo mit workspaces | Gut für offizielle Module, nicht für Community |
| OpenAPI-only (kein Modul-SDK) | Reicht nicht für Hooks/Extension Points |

## Auswirkungen

- Offizielle Module migrieren auf `@vereinsbestellung/module-sdk`
- `backend/modules/_shared/createStubModule.ts` wandert ins SDK
- CI: SDK-Package separat versionieren und publishen
- `docs/DEVELOPER_GUIDE.md` und ADR-003 verweisen auf SDK-Docs

## Migrationsstrategie

| Phase | Maßnahme |
|-------|----------|
| 1 | SDK-Paket extrahieren (Types + BaseModule aus Core) |
| 2 | Payment-Modul auf SDK-Imports umstellen |
| 3 | Stub-Module auf SDK |
| 4 | Test-Utilities + Beispielmodul |
| 5 | Frontend SDK für Admin-Seiten |
| 6 | Community-Plugin-Loader + SDK-Docs auf docs.vereinsbestellung.de |

## Offene Punkte

- [ ] npm-Scope: `@vereinsbestellung` vs. `@timux`
- [ ] SDK im Docker-Image oder zur Build-Zeit von npm?
- [ ] Plugin-Signierung (Code Signing)
- [ ] TypeScript project references vs. published .d.ts
