# ADR-004: Settings Platform

| Feld | Wert |
|------|------|
| **Status** | Accepted (implementiert) |
| **Datum** | 2026-07-08 |

## Ziel

Eine einheitliche Konfigurationsplattform bereitstellen, die Core-Einstellungen, Modul-Konfigurationen und Provider-Secrets konsistent speichert, validiert und in der Admin-UI bearbeitbar macht.

**Alle Anwendungseinstellungen liegen in der Datenbank.** Docker `.env` enthält ausschließlich Infrastruktur. `APP_ENCRYPTION_KEY` ist die einzige Ausnahme für DB-Verschlüsselung.

## Motivation

Früher existierten mehrere Konfigurationsquellen (`.env`, `ClubSettings`, `InstalledModule.configJson`, hardcodierte Admin-Seiten). Die Settings Platform vereinheitlicht Zugriff, Validierung, Verschlüsselung, Audit und Admin-UX.

## Architekturentscheidung

### Zwei Ebenen

```
┌─────────────────────────────────────────────────────────┐
│  Ebene 1: Infrastruktur (.env / Docker)                 │
│  DATABASE_URL, JWT_SECRET, CORS, APP_ENCRYPTION_KEY     │
├─────────────────────────────────────────────────────────┤
│  Ebene 2: Anwendungseinstellungen (PostgreSQL)          │
│  core.* Namespaces → ClubSettings                       │
│  module.* Namespaces → InstalledModule.configJson       │
└─────────────────────────────────────────────────────────┘
```

### Komponenten (`backend/src/platform/settings/`)

| Komponente | Datei | Verantwortung |
|------------|-------|---------------|
| `SchemaRegistry` | `SchemaRegistry.ts` | Registriert Settings-Metadaten pro Namespace |
| `SettingsService` | `SettingsService.ts` | Lesen/Schreiben, Orchestrierung |
| `SettingsValidation` | `SettingsValidation.ts` | Validierung aus Feld-Metadaten |
| `SettingsEncryption` | `SettingsEncryption.ts` | AES-256-GCM via `APP_ENCRYPTION_KEY` |
| `SettingsCache` | `SettingsCache.ts` | In-Memory-Cache (TTL 30s) |
| `FormGenerator` | `FormGenerator.ts` | Dynamische Formular-Metadaten für Admin-UI |
| `ClubSettingsStore` | `stores/ClubSettingsStore.ts` | Persistenz `core.club`, `core.order`, `core.email` |
| `ModuleSettingsStore` | `stores/ModuleSettingsStore.ts` | Persistenz `module.{id}` |

Core-Schemas: `backend/src/core/settings/schemas.ts`  
Modul-Schemas: ausschließlich in `module.json` → `settings.fields`

### Settings-Metadaten (pro Feld)

| Eigenschaft | Beschreibung |
|-------------|--------------|
| `group` | UI-Gruppe |
| `label` | Anzeigename |
| `description` | Kurzbeschreibung |
| `type` | `string`, `text`, `number`, `boolean`, `password`, `email`, `select`, `url` |
| `default` | Standardwert |
| `required` | Pflichtfeld |
| `encrypted` | AES-Verschlüsselung in DB |
| `validation` | min, max, pattern, enum |
| `helpText` | Hilfetext im Formular |

### Namespaces

| Namespace | Speicher | Admin-UI |
|-----------|----------|----------|
| `core.club` | `ClubSettings` | `/admin/verein` |
| `core.order` | `ClubSettings` | `/admin/bestellung` |
| `core.email` | `ClubSettings` (SMTP verschlüsselt) | `/admin/email` |
| `module.payment` | `InstalledModule.configJson` | `/admin/settings/module.payment` |

### API

```
GET  /api/admin/settings                    → Namespace-Liste
GET  /api/admin/settings/:namespace/schema  → Formular-Definition (Metadata + Werte)
GET  /api/admin/settings/:namespace         → Werte (Secrets maskiert)
PUT  /api/admin/settings/:namespace         → Aktualisieren (validiert, audit)
```

### Legacy-API (deprecated)

| Route | Ersatz |
|-------|--------|
| `GET/PUT /api/admin/email-settings` | `GET/PUT /api/admin/settings/core.email` |
| `GET/PUT /api/admin/club` | `GET/PUT /api/admin/settings/core.club` (+ `core.order` für Bestellfelder) |

Legacy-Routen delegieren intern an `SettingsService` via `clubService`.

- `DynamicSettingsForm` – rendert Formulare aus Schema
- `GenericSettingsPage` – generische Admin-Seite für jeden Namespace
- Bestehende Routen (`/admin/verein`, `/admin/email`, …) nutzen die generische UI

### Audit & Hooks

- `AuditService`: `settings.updated` mit Namespace und geänderten Keys
- `CORE_HOOKS.SETTINGS_CHANGED` bei jeder Änderung

### SMTP

SMTP liegt vollständig in der Anwendung (`core.email` → `ClubSettings`). `emailService` liest entschlüsselte Werte über `SettingsService`. Keine SMTP-Variablen in Docker.

## Vorteile

- Ein API- und UI-Muster für Core und Module
- Secrets nie im Klartext in API-Responses
- Module registrieren nur Metadaten – Core erzeugt Formulare
- Cache reduziert DB-Last
- Klare Trennung Infrastruktur vs. Anwendung

## Nachteile

- `ClubSettings` bleibt physisch eine Tabelle (logische Namespaces darüber)
- `VITE_*` bleiben Build-Zeit
- Logo-Upload weiterhin separater Endpunkt

## Alternativen

| Alternative | Bewertung |
|-------------|-----------|
| Alles in `.env` | Ungeeignet für Admin-self-service |
| Externer Config-Service | Overkill für Vereins-Deployment |
| Pro Modul eigene Admin-Seite | Ersetzt durch generische UI |

## Auswirkungen

- `FeatureContext.getConfig/setConfig` delegiert an `SettingsService`
- Payment-Modul: Config nur noch über Settings-API, keine `/admin/config`-Routes
- `PAYMENT_ENCRYPTION_KEY` deprecated → `APP_ENCRYPTION_KEY`
- Legacy-SMTP-Passwörter werden beim Boot verschlüsselt (`migrateLegacySettingsSecrets`)

## Implementierungsstatus

| Komponente | Status |
|------------|--------|
| SchemaRegistry | ✅ |
| SettingsService | ✅ |
| Validation | ✅ |
| Encryption (APP_ENCRYPTION_KEY) | ✅ |
| Audit Log | ✅ |
| Cache | ✅ |
| Namespaces | ✅ |
| Dynamic Form Generation | ✅ Backend + Frontend |
| Module metadata-only | ✅ payment, notifications, printer `module.json` |
| SMTP in Notifications-Modul | ✅ `module.notifications` (nicht mehr `core.email` in Admin) |
| Modul-Settings-Zugriff | ✅ `assertModuleSettingsAccessible` (installiert, nicht nur ENABLED) |
| SMTP in DB | ✅ |

## Konsolidierungsreview (2026-07-09)

Siehe [ADR-003](./003-module-system.md) und [ADR-042](./042-volunteer-first-administration.md).

| Kritikpunkt | Entscheidung |
|-------------|--------------|
| Nur generische Settings-Formulare | Metadata First bleibt Standard |
| Komplexe Module brauchen eigene UI | Optional: `frontend/src/admin/settingsPages.tsx` |
| Kleine Erweiterungen (Logo, Tests) | `settingsExtensions.tsx` pro Namespace |
| Payment | Custom Page (`PaymentAdminPage`) |
| Notifications, Printer | Generisch + Extensions (ausreichend für 1.0) |

## Offene Punkte

- [ ] Settings-Export/Import für Vereins-Migration
- [ ] Generische Permission-Prüfung pro Namespace in Settings-API
- [ ] `ClubSettings` physisch in `platform_settings`-Tabelle migrieren (optional)
- [ ] Widget für Dashboard-Einstellungen aus SchemaRegistry
