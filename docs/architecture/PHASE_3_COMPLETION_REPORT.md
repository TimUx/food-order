# Phase 3 – Abschlussbericht: Plattform-Administration

| Feld | Wert |
|------|------|
| **Phase** | 3 – Platform Administration |
| **Branch** | `feature/v2-multi-tenant-platform` |
| **Datum** | 2026-07-09 |
| **Status** | Abgeschlossen |

## Zusammenfassung

Die FestManager-Plattform verfügt nun über eine **vollständig getrennte Plattform-Administration** unter `/platform` mit eigener API unter `/api/platform/*`. Plattformadministratoren sind von Mandantenbenutzern getrennt und verwalten Mandanten, Einstellungen, Monitoring und Logs zentral.

---

## Neue Plattformfunktionen

| Bereich | Implementierung |
|---------|-----------------|
| **Plattformlogin** | `/platform/login` – separater Auth-Flow, Token `fm_platform_token` |
| **Dashboard** | Mandanten-, Benutzer-, Bestell- und Systemkennzahlen |
| **Mandantenverwaltung** | CRUD, Suche, Filter, Aktivieren/Sperren/Archivieren/Löschen, Export |
| **Plattformsettings** | Lesen/Schreiben über `/api/platform/settings` |
| **Plattformbenutzer** | `PlatformUser`-Modell, Verwaltung über API |
| **Impersonation** | Sichere Mandanten-Impersonation mit sichtbarem Banner |
| **Monitoring** | CPU, RAM, DB, Docker, Uploads |
| **Health** | Aggregierte Infrastruktur-Checks |
| **Logs** | `PlatformAuditLog` mit Mandanten-Filter |
| **Backups** | Architektur-Vorbereitung (kein vollständiger Restore) |

---

## Plattformsettings

Zentrale Schlüssel in `platform_settings`:

| Namespace | Beispiele |
|-----------|-----------|
| `platform.name`, `platform.baseDomain` | Allgemein |
| `platform.registration.*` | Selbstregistrierung |
| `platform.defaults.*` | Standardwerte für neue Mandanten |
| `platform.defaults.modules` | Standardmodule |
| `platform.maintenance.*` | Wartungsmodus |
| `platform.security.*` | Passwortregeln, Session-Timeout |
| `platform.network.*` | CORS, Trusted Proxies |
| `platform.branding.*` | Logo, Farben, Footer |

Neue Mandanten übernehmen Locale, Zeitzone, Währung, Theme und Modul-Vorlagen aus Plattformsettings.

---

## Mandantenverwaltung

- **API:** `GET/POST/PUT/DELETE /api/platform/tenants`
- **Status-Übergänge:** activate, suspend, archive
- **Export:** JSON-Snapshot (Vorbereitung für vollständigen Import)
- **Impersonation:** `POST /api/platform/tenants/:id/impersonate` – Audit-protokolliert

---

## Sicherheit

| Maßnahme | Status |
|----------|--------|
| JWT `scope: platform \| tenant` | ✓ |
| Plattform-Token auf Mandanten-APIs abgelehnt | ✓ |
| Mandanten-Token auf Plattform-APIs abgelehnt | ✓ |
| Separate `PlatformUser`-Tabelle | ✓ |
| Permission-Checks `platform.*`, `tenant.*` | ✓ |
| Impersonation-Banner + Session-Backup | ✓ |
| Audit-Logging aller Plattform-Mutationen | ✓ |

---

## Testergebnisse

| Test | Status |
|------|--------|
| `platformPermissions.test.ts` | Neu |
| `tenantScope.test.ts` | Bestehend (Phase 2) |
| Vitest lokal | ESM-Config-Problem (bekannt) |
| `prisma generate` | CI-Umgebung erforderlich |

---

## Offene Punkte (Phase 4+)

- Vollständiger Tenant-Export/Import mit Dateien
- Backup/Restore-Automatisierung
- MFA für Plattformadministratoren
- Dynamisches CORS aus Plattformsettings
- Subdomain-Routing in Produktion (Traefik/Wildcard-TLS)
- UI-Tests für Plattform-Navigation

---

## Akzeptanzkriterien

| Kriterium | Status |
|-----------|--------|
| Plattformadministrator | ✓ |
| Plattformdashboard | ✓ |
| Mandantenverwaltung vollständig | ✓ |
| Plattformsettings | ✓ |
| Standardwerte neue Mandanten | ✓ |
| Plattform-API | ✓ |
| Impersonation | ✓ |
| Monitoring | ✓ |
| Logging erweitert | ✓ |
| Rechte erweitert | ✓ |
| Dokumentation | ✓ |
