# ADR-020: Multi-Tenant Platform

| Feld | Wert |
|------|------|
| **Status** | Accepted (Phase 0 – Architektur) |
| **Datum** | 2026-07-09 |
| **Version** | 2.0 |
| **Branch** | `feature/v2-multi-tenant-platform` |
| **Abhängigkeiten** | ADR-001, ADR-002, ADR-004 |

## Problem

FestManager wird heute als **Single-Tenant-Anwendung** betrieben: Eine Docker-Installation entspricht genau einem Veranstalter. `ClubSettings` mit fester ID `default`, globale Benutzer-Tabelle und fehlende Mandantentrennung verhindern den Betrieb als zentrale Plattform für beliebig viele Veranstalter.

Mehrere Vereine auf einer Instanz würden ohne Architekturänderung zu Datenvermischung, Sicherheitslücken und unübersichtlicher Verwaltung führen.

## Motivation

Veranstalter (Feuerwehren, Sportvereine, Firmen, Kommunen, Privatveranstalter) sollen künftig auf **einer gemeinsamen Plattform** arbeiten können:

```
Eine Installation
    ↓
beliebig viele Veranstalter (Mandanten)
    ↓
beliebig viele Veranstaltungen
    ↓
beliebig viele Benutzer
```

Der Begriff **Mandant** ist ausschließlich intern. In der Benutzeroberfläche bleibt der Begriff **Veranstalter**.

Phase 0 definiert das Zielbild und die Architektur. **Keine produktiven Multi-Tenant-Funktionen** werden in dieser Phase implementiert.

## Entscheidung

FestManager 2.0 wird eine **mandantenfähige Plattform** mit folgenden zentralen Bausteinen:

| Baustein | Verantwortung | ADR |
|----------|---------------|-----|
| `TenantContext` | Aktueller Mandant pro Request (serverseitig) | [021](./021-tenant-context.md) |
| `PlatformContext` | Plattformweite Informationen (Domain, Version, Wartung) | [021](./021-tenant-context.md) |
| `TenantResolver` | Einzige Stelle für Host-/URL-Auflösung | [023](./023-tenant-routing.md) |
| Shared Database + `tenant_id` | Datenisolation in einer PostgreSQL-Instanz | [024](./024-tenant-data-model.md) |
| Plattform-Administration | Getrennte Verwaltung außerhalb aller Mandanten | [022](./022-platform-administration.md) |
| Plattformeinstellungen | Zentrale Konfiguration der Installation | [025](./025-platform-settings.md) |
| Sicherheitskonzept | Isolation, CORS, Auth, Rate Limits | [026](./026-multi-tenant-security.md) |
| Deployment-Konzept | Traefik, Wildcard-TLS, Volumes | [027](./027-multi-tenant-deployment.md) |

### Architekturübersicht

```
                    ┌─────────────────────────────────────────┐
                    │           Reverse Proxy (Traefik)        │
                    │  *.festmanager.org  |  festmanager.org   │
                    └──────────────┬──────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
     Plattform-Routing      TenantResolver        Forwarded Headers
     (festmanager.org)     (Subdomain/Prefix)     (Host, X-Forwarded-*)
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   ▼
                    ┌─────────────────────────────────────────┐
                    │              Backend (Express)           │
                    │  PlatformContextMiddleware               │
                    │  TenantContextMiddleware                 │
                    │  ┌─────────────┐  ┌──────────────────┐  │
                    │  │ Core + API  │  │ Module System    │  │
                    │  └─────────────┘  └──────────────────┘  │
                    └────────────────────┬────────────────────┘
                                         │ tenant_id in Queries
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │         PostgreSQL (Shared Schema)       │
                    │  tenants | events | orders | users | …    │
                    └─────────────────────────────────────────┘

                    ┌─────────────────────────────────────────┐
                    │         Frontend (React SPA)             │
                    │  PlatformProvider | TenantProvider       │
                    └─────────────────────────────────────────┘
```

### Kernprinzipien

1. **Ein Resolver, ein Context** – Module und Services lesen den Mandanten ausschließlich über `TenantContext`, niemals über Hostname, URL oder `tenant_id`-Parameter.
2. **Serverseitige Mandantenermittlung** – APIs akzeptieren keinen `tenant_id`-Requestparameter.
3. **Shared Database, Shared Schema** – Keine separaten Datenbanken oder Schemas pro Mandant.
4. **Abwärtskompatibilität** – Bestehende Installationen erhalten automatisch einen Standard-Mandanten; kein Datenverlust.
5. **Getrennte Verwaltungsebenen** – Plattform-Administration ist strikt von Mandanten-Administration getrennt.

### API-Design (Zukunft)

| Regel | Beschreibung |
|-------|--------------|
| Kein `tenant_id` in Query/Body/Path | Mandant wird aus Request-Kontext abgeleitet |
| Plattform-API unter `/api/platform/*` | Nur für Plattform-Admins, kein TenantContext |
| Mandanten-API unter `/api/*` | Automatisch mandantenbezogen |
| Öffentliche API | TenantContext aus Resolver, keine Authentifizierung für Bestellungen |

### Frontend-Design (Zukunft)

| Komponente | Ersetzt / ergänzt |
|------------|-------------------|
| `TenantProvider` | `ClubContext` (UI-Begriff bleibt „Veranstalter“) |
| `PlatformProvider` | Build-Zeit-`VITE_*` für plattformweite Werte |
| Keine Host-Parsing in Komponenten | Tenant-Daten nur aus Provider |

### Modulanalyse (erforderliche Änderungen)

In Phase 0 erfolgen **keine Codeänderungen**. Folgende Anpassungen sind für Phase 1+ geplant:

| Modul | Status v1.4 | Erforderliche Änderungen |
|-------|-------------|--------------------------|
| **payment** | ✅ Vollständig | `InstalledModule.configJson` mandantenscharf; Stripe-Keys pro Mandant; Webhooks mit Tenant-Auflösung über Signatur/Metadaten; keine direkte `config.corsOrigin`-Nutzung |
| **notifications** | ✅ Vollständig | SMTP/Kanäle pro Mandant (bereits über Settings); Versand kontextualisiert über `TenantContext` |
| **printer** | ✅ Vollständig | Drucker-Konfiguration pro Mandant; Bondruck-Jobs mandantenisoliert |
| **legal** | ✅ Vollständig | `LegalPage` erhält `tenant_id`; Footer-Links mandantenspezifisch |
| **inventory** | 🔜 Stub | Alle Tabellen mit `tenant_id`; Lagerbestand pro Mandant |
| **voucher** | 🔜 Stub | Gutscheine mandantengebunden |
| **discount** | 🔜 Stub | Rabattregeln pro Mandant |
| **analytics** | 🔜 Stub | Aggregationen immer mit `tenant_id`-Filter |
| **loyalty** | 🔜 Stub | Treuepunkte pro Mandant |
| **checkin** | 🔜 Stub | QR-Codes mandantenspezifisch |
| **cash-register** | 🔜 Stub | Kassenanbindung pro Mandant |

**Core-Änderungen (Phase 1+):**

| Bereich | Ist-Zustand | Ziel |
|---------|-------------|------|
| `clubService` / `ClubSettings` | Singleton `id: "default"` | Mandanteneinstellungen über `TenantContext` |
| `clubRepository` | Kein Mandantenfilter | Alle Queries mit `tenant_id` |
| `User` / `Role` | Global | Mandantenzuordnung + Plattform-Admins |
| `Event`, `Order`, `FoodItem`, … | Global | `tenant_id` auf allen mandantenbezogenen Tabellen |
| `FeatureContext` | Kein Mandant | `getTenantId()` aus `TenantContext` |
| `SettingsService` | `ClubSettingsStore` | Tenant-scoped Stores |
| `socket/index.ts` | Globale Rooms | Rooms mit Tenant-Präfix (`tenant:{id}:orders`) |
| `frontend/ClubContext` | `api.getClub()` | `TenantProvider` mit Resolver-basiertem API-Pfad |

### Migrationsstrategie (Überblick)

Siehe [ADR-024](./024-tenant-data-model.md) für Details.

1. `tenants`-Tabelle anlegen
2. Standard-Mandant aus bestehendem `ClubSettings` erzeugen
3. `tenant_id` auf alle mandantenbezogenen Tabellen migrieren (Default = Standard-Mandant)
4. `ClubSettings` in Mandanteneinstellungen überführen
5. Indizes auf `tenant_id` ergänzen
6. Feature-Flag `MULTI_TENANT_ENABLED` für schrittweise Aktivierung

### Teststrategie (Zukunft)

In Phase 0 werden **keine Multi-Tenant-Tests** implementiert. Geplante Testebenen:

| Ebene | Inhalt |
|-------|--------|
| Unit | `TenantResolver` (Subdomain, Prefix, Fallback), `TenantContext`-Middleware |
| Integration | API-Isolation: Mandant A sieht keine Daten von Mandant B |
| Security | Host-Header-Spoofing, Cross-Tenant-Zugriff, CORS |
| E2E | Subdomain-Routing, Mandanten-Branding, Login-Scope |
| Migration | Upgrade von Single-Tenant-Backup ohne Datenverlust |
| Performance | Resolver-Cache, Index-Nutzung bei `tenant_id`-Filtern |

Bestehende Tests (`tests/api/*`, `tests/integration/*`, `tests/e2e/*`) müssen in Phase 1 angepasst werden:

- Seed-Daten erhalten expliziten Standard-Mandanten
- API-Setup setzt `TenantContext` (oder nutzt Default-Mandant-Header in Tests)
- E2E-Tests laufen gegen Single-Tenant-Default (kein Subdomain-Setup in CI nötig)

## Alternativen

| Alternative | Bewertung |
|-------------|-----------|
| **Database-per-Tenant** | Stärkere Isolation, aber hoher Betriebsaufwand, schwierige Migrationen und Backups → abgelehnt |
| **Schema-per-Tenant** | PostgreSQL-Schema pro Mandant; komplexe Prisma-Konfiguration, Modul-Migrationen × N → abgelehnt |
| **tenant_id als API-Parameter** | Einfach zu implementieren, aber anfällig für Cross-Tenant-Angriffe → abgelehnt |
| **Separate Instanzen pro Verein** | Aktueller Zustand; skaliert nicht als SaaS-Plattform → überholt |
| **Row-Level Security (PostgreSQL RLS)** | Zusätzliche DB-Schicht; optional als Defense-in-Depth in Phase 3 |

## Auswirkungen

- Alle neuen Features müssen `TenantContext` respektieren
- `ClubSettings` und `clubService` werden perspektivisch durch mandantenscharfe Settings ersetzt
- Docker-Deployment benötigt Wildcard-DNS und TLS (siehe ADR-027)
- Plattform-Administration ist neuer Verwaltungsbereich
- Version 2.0 führt Breaking Changes in der Infrastruktur ein, nicht in der Mandanten-UX (nach Migration)

## Risiken

| Risiko | Mitigation |
|--------|------------|
| Cross-Tenant-Datenleck durch fehlenden `tenant_id`-Filter | Repository-Basisklasse mit erzwungenem Filter; Code-Review-Checkliste; Integrationstests |
| Host-Header-Spoofing | Resolver validiert gegen `PlatformSettings.allowedDomains` |
| Performance bei vielen Mandanten | Indizes auf `tenant_id`; Resolver-Cache; Redis-Vorbereitung |
| Komplexe Migration bestehender Installationen | Automatischer Standard-Mandant; idempotente Migration; Backup-Pflicht |
| Cookie-Scope über Subdomains | Zentrale Auth-Strategie (ADR-026); `Domain`-Cookie nur wo nötig |

## Architekturreview

Bewertung der geplanten Architektur (Phase 0):

| Kriterium | Bewertung | Anmerkung |
|-----------|-----------|-----------|
| Modular | ✅ Gut | Context-Pattern integriert sich in bestehendes Modulsystem und `FeatureContext` |
| Wartbar | ✅ Gut | Ein Resolver, ein Context – klare Verantwortlichkeiten |
| Erweiterbar | ✅ Gut | Neue Routing-Strategien nur im Resolver; Module bleiben mandantenagnostisch |
| Performant | ⚠️ Akzeptabel | Shared DB mit Indizes; Redis-Cache für Resolver in Phase 2 vorgesehen |
| Sicher | ✅ Gut mit Vorsicht | Defense-in-Depth nötig; RLS optional |

| Komponente | Bewertung | Verbesserung (eingearbeitet) |
|------------|-----------|------------------------------|
| `TenantContext` | ✅ | `AsyncLocalStorage` für Request-Scope; explizites `requireTenant()` für geschützte Routen |
| `PlatformContext` | ✅ | Von `TenantContext` strikt getrennt; keine Mandantendaten |
| `TenantResolver` | ✅ | Prioritätenkette dokumentiert (ADR-023); negative Cache für unbekannte Subdomains |
| Shared Database | ✅ | Zusammengesetzte Indizes `(tenant_id, …)` statt nur `tenant_id` |
| Routing | ✅ | Subdomain primär; Prefix optional und deaktivierbar per Plattformsetting |
| Plattformverwaltung | ✅ | Eigene Auth-Domäne; kein Zugriff auf Mandantendaten ohne Audit |

## Spätere Erweiterungen

- Custom Domains pro Mandant (`bestellung.feuerwehr-xy.de`)
- Mandanten-Self-Service-Registrierung
- Mandanten-Quota und Abrechnung
- Horizontale Skalierung mit Redis (Socket.IO Adapter, Resolver-Cache)
- PostgreSQL Row-Level Security als zusätzliche Schicht
- Mandanten-Export/-Import für Umzug
- Community-Plugins mit Mandanten-Scope

## Verwandte ADRs

- [021 – Tenant Context & Platform Context](./021-tenant-context.md)
- [022 – Platform Administration](./022-platform-administration.md)
- [023 – Tenant Routing & Resolver](./023-tenant-routing.md)
- [024 – Tenant Data Model](./024-tenant-data-model.md)
- [025 – Platform Settings](./025-platform-settings.md)
- [026 – Multi-Tenant Security](./026-multi-tenant-security.md)
- [027 – Multi-Tenant Deployment](./027-multi-tenant-deployment.md)
