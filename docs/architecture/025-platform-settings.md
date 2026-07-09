# ADR-025: Platform Settings

| Feld | Wert |
|------|------|
| **Status** | Accepted (Phase 0 – Architektur) |
| **Datum** | 2026-07-09 |
| **Version** | 2.0 |
| **Abhängigkeiten** | ADR-004, ADR-020, ADR-022 |

## Problem

Die bestehende Settings Platform (ADR-004) verwaltet ausschließlich mandantenbezogene Einstellungen über `ClubSettings`. Für Multi-Tenant-Betrieb fehlen **plattformweite Konfigurationen** (Domain, CORS, Registrierung, Defaults) und eine klare Trennung von Mandanteneinstellungen.

## Motivation

Der Plattformbetreiber muss zentrale Parameter konfigurieren können, die für alle Mandanten gelten – ohne dass Mandanten-Admins diese Werte ändern können.

## Entscheidung

### Zwei Einstellungsebenen

```
┌─────────────────────────────────────────────────────────────┐
│  Ebene 1: Infrastruktur (.env / Docker)                      │
│  DATABASE_URL, JWT_SECRET, APP_ENCRYPTION_KEY, TRUSTED_PROXIES│
├─────────────────────────────────────────────────────────────┤
│  Ebene 2a: Plattformeinstellungen (PostgreSQL)               │
│  platform.* Namespaces → platform_settings Tabelle           │
├─────────────────────────────────────────────────────────────┤
│  Ebene 2b: Mandanteneinstellungen (PostgreSQL)               │
│  tenant.* Namespaces → tenant_settings / TenantModule        │
└─────────────────────────────────────────────────────────────┘
```

### Plattformsettings (Minimum)

| Schlüssel | Typ | Beschreibung | Default |
|-----------|-----|--------------|---------|
| `platform.name` | string | Anzeigename der Plattform | FestManager |
| `platform.baseDomain` | string | Basis-Domain | festmanager.org |
| `platform.wildcardDomain` | string | Wildcard-Pattern | *.festmanager.org |
| `platform.allowedDomains` | string[] | Erlaubte Host-Header | [baseDomain, wildcard] |
| `platform.cors.allowedOrigins` | string[] | CORS-Origins (dynamisch erweiterbar) | [] |
| `platform.cors.allowCredentials` | boolean | Cookies erlauben | true |
| `platform.registration.enabled` | boolean | Mandanten-Self-Registration | false |
| `platform.registration.requireApproval` | boolean | Freigabe durch Plattform-Admin | true |
| `platform.defaults.locale` | string | Standard-Sprache neuer Mandanten | de-DE |
| `platform.defaults.timezone` | string | Standard-Zeitzone | Europe/Berlin |
| `platform.defaults.theme` | string | Standard-Theme | default |
| `platform.defaults.modules` | string[] | Automatisch aktivierte Module | [] |
| `platform.defaults.currency` | string | Standard-Währung | EUR |
| `platform.smtp.default` | object | Fallback-SMTP (optional) | null |
| `platform.branding.logoUrl` | string | Plattform-Logo | null |
| `platform.branding.faviconUrl` | string | Favicon | null |
| `platform.branding.primaryColor` | string | Akzentfarbe Plattform-UI | #1976d2 |
| `platform.maintenance.enabled` | boolean | Globaler Wartungsmodus | false |
| `platform.maintenance.message` | text | Wartungshinweis | |
| `platform.routing.pathPrefixEnabled` | boolean | URL-Prefix-Routing | false |
| `platform.update.channel` | enum | stable / beta | stable |
| `platform.reservedSubdomains` | string[] | Gesperrte Subdomains | [www, api, …] |

### Speicherung

```prisma
model PlatformSettings {
  key       String   @id
  value     Json
  encrypted Boolean  @default(false)
  updatedAt DateTime @updatedAt
  updatedBy String?  // PlatformUser.id

  @@map("platform_settings")
}
```

Alternativ Key-Value-Store analog zu bestehendem `SettingsService` mit Namespace `platform.*`.

### API

```
GET  /api/platform/settings                    → Namespace-Liste
GET  /api/platform/settings/:namespace/schema  → Formular-Definition
GET  /api/platform/settings/:namespace         → Werte (Secrets maskiert)
PUT  /api/platform/settings/:namespace         → Aktualisieren (nur PLATFORM_ADMIN)
```

### Mandanteneinstellungen

Mandanten verwalten **ausschließlich** folgende Bereiche (UI-Begriff „Veranstalter“):

| Bereich | Namespace | Beschreibung |
|---------|-----------|--------------|
| Organisation | `tenant.organization` | Name, Logo, Beschreibung |
| Logo | `tenant.organization` | Upload |
| Kontakt | `tenant.organization` | Ansprechpartner, E-Mail, Telefon, Adresse |
| SMTP | `tenant.module.notifications` | E-Mail-Versand des Mandanten |
| Payment | `tenant.module.payment` | Zahlungsanbieter |
| Module | `tenant.modules` | Aktivierung optionaler Module |
| Veranstaltungen | Core-Admin | Events CRUD |
| Benutzer | Core-Admin | Team des Mandanten |
| Rechtliche Informationen | `tenant.module.legal` | Impressum, Datenschutz, … |
| Notification | `tenant.module.notifications` | Kanäle, Templates |
| Theme | `tenant.appearance` | Farben, Dark Mode |

**Mandanten dürfen NICHT ändern:**

- Plattform-Domain, CORS, Wildcard
- Globalen Wartungsmodus
- Andere Mandanten
- Update-Kanal
- Reservierte Subdomains

### Integration mit bestehender Settings Platform

| Komponente | Anpassung |
|------------|-----------|
| `SchemaRegistry` | Registrierung `platform.*` und `tenant.*` Namespaces |
| `SettingsService` | `getPlatformSettings()` vs. `getTenantSettings()` |
| `ClubSettingsStore` | Wird `TenantSettingsStore` |
| Neuer `PlatformSettingsStore` | Persistenz in `platform_settings` |
| `PlatformContext` | Lädt aus `PlatformSettings` beim Boot + Cache |

### CORS-Konfiguration

Plattformsettings steuern CORS dynamisch:

```typescript
// Pseudocode
const origins = [
  ...platformSettings.cors.allowedOrigins,
  `https://${platformSettings.baseDomain}`,
  // Wildcard-Subdomains werden per Callback validiert
];
```

Details siehe [ADR-026](./026-multi-tenant-security.md) und [ADR-027](./027-multi-tenant-deployment.md).

## Alternativen

| Alternative | Bewertung |
|-------------|-----------|
| Plattformsettings in `.env` | Nicht administrierbar; Neustart nötig → nur Infrastruktur |
| Eine Settings-Tabelle mit `scope` | Möglich, aber Namespace-Trennung klarer → bevorzugt |
| Mandantensettings in separater DB | Widerspricht Shared-DB-Strategie → abgelehnt |

## Auswirkungen

- Neue Tabelle `platform_settings`
- `ClubSettings` → `TenantSettings` Migration
- Plattform-Admin-UI für Settings
- `PlatformContext` bezieht Daten aus DB statt `.env` (wo anwendbar)
- Bestehende `.env`-Variablen `CORS_ORIGIN` wird Fallback für Entwicklung

## Risiken

| Risiko | Mitigation |
|--------|------------|
| Fehlkonfigurierte Domain sperrt alle Mandanten | Validierung vor Speichern; Rollback; Default-Fallback |
| CORS zu permissiv | Whitelist + Subdomain-Callback; Audit bei Änderung |
| Secrets in PlatformSettings | Verschlüsselung via `APP_ENCRYPTION_KEY` (wie ADR-004) |

## Spätere Erweiterungen

- Settings-Versionierung und Rollback
- Mandanten-Templates (Vordefinierte Settings-Sets)
- Feature-Flags pro Mandant auf Plattformebene
- Externe Config-Sync (GitOps) für Enterprise

## Verwandte ADRs

- [004 – Settings Platform](./004-settings-platform.md)
- [020 – Multi-Tenant Platform](./020-multi-tenant-platform.md)
- [022 – Platform Administration](./022-platform-administration.md)
- [026 – Multi-Tenant Security](./026-multi-tenant-security.md)
