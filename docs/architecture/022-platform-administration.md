# ADR-022: Platform Administration

| Feld | Wert |
|------|------|
| **Status** | Implemented (Phase 3) |
| **Datum** | 2026-07-09 |
| **Version** | 2.0 |
| **Abhängigkeiten** | ADR-020, ADR-021, ADR-025 |

## Problem

Die aktuelle Administration (`/admin/*`) verwaltet einen einzigen Veranstalter. Für eine Multi-Tenant-Plattform fehlt eine **plattformweite Verwaltungsebene** für Betreiber der Installation – getrennt von der Verwaltung einzelner Veranstalter.

Ohne klare Trennung riskieren Plattform-Admins Mandantendaten zu vermischen oder Mandanten-Admins erhalten Zugriff auf systemkritische Einstellungen.

## Motivation

Der Plattformbetreiber (z. B. Vereinsverband, IT-Dienstleister, SaaS-Anbieter) muss Mandanten anlegen, überwachen und die Installation konfigurieren können – ohne in den operativen Alltag einzelner Veranstalter einzugreifen.

## Entscheidung

Eine **vollständig getrennte Plattform-Administration** wird unter der Basis-Domain betrieben, außerhalb sämtlicher Mandanten-Kontexte.

### Routing

| URL | Bereich | TenantContext |
|-----|---------|---------------|
| `https://festmanager.org` | Plattform-Landing, Info | Nein |
| `https://festmanager.org/platform` | Plattform-Administration (SPA) | Nein |
| `https://festmanager.org/api/platform/*` | Plattform-API | Nein |
| `https://{slug}.festmanager.org/admin/*` | Mandanten-Administration | Ja |

### Plattform-Administrationsbereiche

| Bereich | Beschreibung | API-Prefix |
|---------|--------------|------------|
| **Dashboard** | Übersicht: Mandantenanzahl, aktive Events, Systemstatus | `/api/platform/dashboard` |
| **Mandanten** | CRUD, Aktivierung, Sperrung, Archivierung | `/api/platform/tenants` |
| **Benutzer** | Plattform-Administratoren, globale Benutzerverwaltung | `/api/platform/users` |
| **Health** | Aggregierter Gesundheitsstatus aller Dienste | `/api/platform/health` |
| **System** | Version, Update-Kanal, Wartungsmodus | `/api/platform/system` |
| **Logs** | Plattform-Audit-Log, Fehlerprotokolle | `/api/platform/logs` |
| **Monitoring** | Metriken, Mandanten-Aktivität (Phase 2+) | `/api/platform/monitoring` |
| **Einstellungen** | Plattformsettings (ADR-025) | `/api/platform/settings` |

### Mandantenverwaltung (Detail)

| Aktion | Beschreibung |
|--------|--------------|
| Anlegen | Name, Slug, Subdomain, Ansprechpartner, E-Mail |
| Aktivieren | Mandant wird über Resolver erreichbar |
| Suspendieren | Mandant zeigt Wartungsseite, keine Bestellungen |
| Archivieren | Daten bleiben, Mandant nicht mehr erreichbar |
| Impersonation (optional, Phase 3) | Plattform-Admin betritt Mandant-Admin mit Audit |

### Authentifizierung

| Aspekt | Entscheidung |
|--------|--------------|
| Rollen | `PLATFORM_ADMIN` (neu), getrennt von `ADMIN`/`STAFF` |
| Login | `https://festmanager.org/platform/login` |
| JWT-Scope | `scope: "platform"` – nicht gültig für Mandanten-APIs |
| Mandanten-Admin-JWT | `scope: "tenant"` + `tenantId` – nicht gültig für Plattform-APIs |
| Session-Trennung | Separate Cookie-Namen (`fm_platform_token` vs. `fm_tenant_token`) |

### Frontend-Struktur (geplant)

```
frontend/src/
  pages/
    platform/           # Plattform-Admin (neu)
      PlatformLoginPage.tsx
      PlatformDashboardPage.tsx
      TenantsPage.tsx
      PlatformSettingsPage.tsx
      ...
    admin/              # Mandanten-Admin (bestehend, mandantenscharf)
```

### Abgrenzung Mandanten-Administration

| Funktion | Plattform-Admin | Mandanten-Admin (`/admin`) |
|----------|-----------------|----------------------------|
| Mandant anlegen/löschen | ✅ | ❌ |
| Veranstaltungen verwalten | ❌ (nur Impersonation) | ✅ |
| Speisen, Bestellungen | ❌ | ✅ |
| SMTP des Mandanten | ❌ | ✅ |
| Module aktivieren | ❌ (Default-Module setzen) | ✅ |
| Plattform-Domain/CORS | ✅ | ❌ |
| Wartungsmodus global | ✅ | ❌ |
| Mandanten-Wartungsmodus | ✅ | ❌ |

### Audit

Alle Plattform-Admin-Aktionen werden in `PlatformAuditLog` protokolliert:

- `platform.tenant.created`, `platform.tenant.suspended`, …
- `platform.settings.updated`
- `platform.admin.impersonation.start` (falls aktiviert)

## Alternativen

| Alternative | Bewertung |
|-------------|-----------|
| Plattform-Admin unter `/admin/platform` auf Mandanten-Domain | Verwirrend, Sicherheitsrisiko → abgelehnt |
| Separates Admin-Backend (Microservice) | Overhead für Vereins-Deployment → abgelehnt |
| CLI-only Plattformverwaltung | Unzureichend für ehrenamtliche Betreiber → abgelehnt |
| Mandanten-Admins dürfen Plattform konfigurieren | Verletzt Mandantentrennung → abgelehnt |

## Auswirkungen

- Neue Benutzerrolle `PLATFORM_ADMIN` in Datenmodell
- Separates Frontend-Routing und Auth-Flow
- Bestehende `/admin/*`-Routen bleiben mandantenspezifisch
- `PlatformAuditLog` erhält `actorType: "platform" | "tenant"`
- Seed-Skript erstellt initialen Plattform-Admin

## Risiken

| Risiko | Mitigation |
|--------|------------|
| Plattform-Admin kompromittiert | MFA (Phase 2); IP-Allowlist optional; Audit |
| Impersonation-Missbrauch | Explizites Audit; Zeitlimit; Opt-in pro Mandant |
| Verwechslung Admin-Ebenen | Visuell unterschiedliche UI (Farbe/Logo); separate URLs |

## Spätere Erweiterungen

- Self-Service-Mandantenregistrierung mit Freigabe-Workflow
- Mandanten-Quota (Events, Benutzer, Speicher)
- Abrechnung und Subscription-Tiers
- Multi-Plattform-Admin mit granularen Berechtigungen
- Mandanten-Analytics-Dashboard für Plattformbetreiber

## Verwandte ADRs

- [020 – Multi-Tenant Platform](./020-multi-tenant-platform.md)
- [021 – Tenant Context](./021-tenant-context.md)
- [025 – Platform Settings](./025-platform-settings.md)
- [026 – Multi-Tenant Security](./026-multi-tenant-security.md)
