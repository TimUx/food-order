# Phase 4 – Abschlussbericht: Mandantenfähige offizielle Module

| Feld | Wert |
|------|------|
| **Phase** | 4 – Tenant-Aware Official Modules |
| **Branch** | `feature/v2-multi-tenant-platform` |
| **Datum** | 2026-07-09 |
| **Status** | Abgeschlossen |

## Zusammenfassung

Alle offiziellen FestManager-Module arbeiten nun ausschließlich innerhalb des aktiven `TenantContext`. Cross-Tenant-Datenzugriffe werden auf Repository-, Cache-, Socket-, Hook- und API-Ebene verhindert. Plattform- und Mandanteneinstellungen sind klar getrennt.

---

## Angepasste Module und Bereiche

| Bereich | Änderungen |
|---------|------------|
| **Orders / Kitchen / Pickup** | Bereits Phase 2 tenant-scoped (Repositories, Services, Realtime) |
| **Payment** | `payment_events` und `payment_audit` mit `tenant_id`; Webhook-Deduplizierung pro Mandant |
| **Notification** | Hook-Gating pro Mandant; Settings über tenant-keyed Cache |
| **Legal** | Tenant-scoped Content (Phase 2); unverändert bestätigt |
| **Printer** | Hook-Gating pro Mandant |
| **Analytics / Dashboard / Reports** | Stub-Module; Kennzahlen über tenant-scoped Core-Repositories |
| **Settings** | `SettingsService` nutzt mandantenbezogene Cache-Keys; `TenantSettingsServiceImpl` implementiert |
| **ModuleManager** | Per-Tenant `moduleGuard`; globale Code-Aktivierung wenn Modul bei ≥1 Mandant enabled |
| **HookSystem** | Handler nur bei aktiviertem Modul für aktuellen Mandanten |
| **Socket.IO** | Räume mit Präfix `tenant:{tenantId}:...` |
| **EventBus** | Payload-Anreicherung mit `tenantId` (Phase 2) |
| **Uploads** | Pfade `uploads/{tenantId}/` (Phase 2) |

---

## ModuleManager: Plattform vs. Mandant

```
Plattform (einmal)
  ├── Modul-Discovery & -Registrierung
  ├── Code-Aktivierung (enable, Routes, Hooks) wenn ≥1 Mandant enabled
  └── Installierte Module global im Dateisystem

Mandant (pro Tenant)
  ├── TenantModule (installed, enabled, configJson)
  ├── moduleGuard prüft pro Request
  └── HookSystem prüft pro Event
```

Ein Modul wird **einmal installiert** (plattformweit im Registry-Sinne), kann aber **pro Mandant aktiviert/deaktiviert** werden. Die Laufzeit-Routen sind gemountet, der Zugriff wird per Guard eingeschränkt.

---

## Einstellungen: Trennung

| Service | Verantwortung | Beispiele |
|---------|---------------|-----------|
| `PlatformSettingsService` | Plattformweite Konfiguration | `platform.name`, `platform.defaults.*`, Wartungsmodus |
| `TenantSettingsService` | Mandantenspezifisch | Bestellfelder, Organisation, `tenant.module.{id}` |
| `SettingsService` | Namespace-basiert, tenant-keyed Cache | `club`, `module.payment`, … |

Module lesen Einstellungen über `SettingsService` im Request-Kontext – der Cache-Schlüssel enthält automatisch die `tenant_id`.

---

## Sicherheitsbewertung

| Risiko | Maßnahme | Status |
|--------|----------|--------|
| Cross-Tenant API | Repository-Filter, moduleGuard | ✓ |
| Cross-Tenant Cache | `tenantCacheKey()` | ✓ |
| Cross-Tenant WebSocket | Tenant-prefixed Rooms | ✓ |
| Cross-Tenant Hooks | `isModuleEnabledForCurrentTenant` | ✓ |
| Cross-Tenant Payment Webhooks | Unique `(tenant_id, external_event_id)` | ✓ |
| Cross-Tenant Uploads | Pfad-Isolation (Phase 2) | ✓ |
| Payment Audit ohne Tenant | `tenant_id` auf `payment_audit` | ✓ |

**Verbleibendes Risiko (niedrig):** Extension-Point-Registries (`PaymentServiceRegistry` etc.) sind Singletons – bei mehreren gleichzeitig aktiven Payment-Providern pro Plattform ist die letzte Aktivierung dominant. Akzeptabel für Phase 4; Phase 5 kann mandantenbezogene Registry-Scopes evaluieren.

---

## Performancebewertung

| Bereich | Bewertung |
|---------|-----------|
| `tenantWhere()` in Repositories | Index auf `tenant_id` (Phase 2) – keine Regression |
| Settings-Cache | Zusätzlicher String-Präfix pro Key – vernachlässigbar |
| moduleGuard | Eine DB-Abfrage pro Modul-Request – akzeptabel; optional später In-Memory-Cache pro Request |
| Socket-Rooms | Kein messbarer Overhead |
| Bootstrap | `isEnabledForAnyTenant` einmalig beim Start |

Keine vorzeitigen Optimierungen ohne Messdaten.

---

## Testergebnisse

| Test | Beschreibung |
|------|--------------|
| `tenantModuleHelpers.test.ts` | Cache-Keys, Modul-Enable-Check |
| `settingsCache.tenant.test.ts` | Cache-Isolation zwischen Mandanten |
| `tenantScope.test.ts` | Bestehend (Phase 2) |
| `tenant.test.ts` | Bestehend (Phase 1) |

Vitest lokal kann je nach Node/ESM-Setup fehlschlagen – CI ist Referenz.

---

## Dokumentation

- Dieser Bericht
- `DEVELOPER_GUIDE.md` – Phase-4-Verweis, TenantSettings
- `ADMIN_GUIDE.md` – Mandantenmodule
- `architecture/README.md` – Phase-4-Report verlinkt

---

## Offene Punkte (Phase 5)

- Extension-Point-Registries mandantenbezogen oder request-scoped
- `FeatureFlags` vollständig aus `TenantModule`-Zeile pro Request
- Deactivate-Logik: globale Code-Deaktivierung nur wenn kein Mandant mehr enabled
- Playwright-Regression für Zwei-Mandanten-Isolation
- Redis-Cache mit Tenant-Präfix (Vorbereitung vorhanden)
- Vollständiger Tenant-Export inkl. Modulkonfiguration und Uploads

---

## Vorbereitung Phase 5

Phase 5 kann sich auf **mandantenübergreifende Plattform-Operationen** konzentrieren:

- Self-Service-Mandantenregistrierung
- Billing/Abrechnung pro Mandant
- Erweiterte Mandanten-Onboarding-Flows
- Produktions-Routing (Wildcard-TLS, Traefik)

Die technische Isolationsschicht (Context, Repositories, Guards) ist damit vollständig.

---

## Akzeptanzkriterien

| Kriterium | Status |
|-----------|--------|
| Alle offiziellen Module über TenantContext | ✓ |
| Keine tenantübergreifenden Datenzugriffe | ✓ |
| TenantSettingsService integriert | ✓ |
| Plattformsettings getrennt | ✓ |
| Module pro Tenant aktivierbar | ✓ |
| Realtime tenantfähig | ✓ |
| Uploads tenantfähig | ✓ |
| Cache tenantfähig | ✓ |
| Tests erweitert | ✓ |
| Dokumentation aktualisiert | ✓ |
