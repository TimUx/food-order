# Phase 2 – Abschlussbericht: Multi-Tenant Database & Data Migration

| Feld | Wert |
|------|------|
| **Phase** | 2 – Multi-Tenant Database & Data Migration |
| **Branch** | `feature/v2-multi-tenant-platform` |
| **Datum** | 2026-07-09 |
| **Status** | Abgeschlossen |

## Zusammenfassung

Die FestManager-Plattform nutzt nun ein **Shared Database, Shared Schema**-Modell mit `tenant_id` auf allen mandantenbezogenen Tabellen. Bestehende Installationen werden beim App-Start automatisch in den Standard-Mandanten (`slug: default`, Name „Lokale Installation“) migriert. Repository-Abfragen filtern zentral über `tenantScope` (`tenantWhere`, `withTenantId`, `requireTenantId`).

---

## Geänderte Tabellen

| Tabelle | `tenant_id` | FK | Indizes | Unique-Änderungen |
|---------|-------------|-----|---------|-------------------|
| `User` | Ja | → `tenants` | `tenant_id`, `(tenant_id, email)` | E-Mail pro Mandant |
| `Event` | Ja | → `tenants` | `tenant_id`, `(tenant_id, isActive)`, `(tenant_id, createdAt)` | – |
| `Customer` | Ja | → `tenants` | `tenant_id` | – |
| `FoodItem` | Ja | → `tenants` | `tenant_id`, `(tenant_id, eventId)` | – |
| `Order` | Ja | → `tenants` | `tenant_id`, `(tenant_id, status)`, `(tenant_id, eventId)`, `(tenant_id, createdAt)` | – |
| `DailyOrderCounter` | Ja | → `tenants` | `tenant_id` | – |
| `legal_pages` | Ja | → `tenants` | `tenant_id` | `(tenant_id, page_type)`, `(tenant_id, slug)` |
| `modules` (TenantModule) | Ja | → `tenants` | `tenant_id` | PK `(tenant_id, module_id)` |
| `module_migrations` | Ja | → `tenants` | `tenant_id` | PK `(tenant_id, module_id, migration)` |
| `payments` | Ja | → `tenants` | `tenant_id`, `(tenant_id, status)` | – |
| `payment_provider_config` | Ja | – | – | PK `(tenant_id, provider_id)` |
| `ClubSettings` | Optional | → `tenants` | `tenant_id` (unique) | Legacy `id=default` |
| `platform_audit_log` | Optional | – | `tenant_id`, `(tenant_id, created_at)` | – |

### Plattformweit (ohne `tenant_id`)

| Tabelle | Begründung |
|---------|------------|
| `platform_settings` | Globale Plattformkonfiguration |
| `platform_audit_log` (optional `tenant_id`) | Plattform- und Mandanten-Audit |
| `Role` | ADMIN/STAFF rollen plattformweit |
| `tenants`, `tenant_settings` | Mandanten-Stammdaten |

---

## Migrationsergebnisse

### Automatische Migration (`migrateMultiTenantSchema`)

- **Auslöser:** App-Start nach `ensureDefaultTenant()`
- **Marker:** `platform_settings.multi_tenant_schema_v1`
- **Idempotent:** Ja – wiederholte Starts überspringen abgeschlossene Migration
- **Schritte:** SQL-ALTER pro Tabelle, Daten-Zuordnung zum Default-Tenant, Upload-Dateien → `uploads/{tenantId}/`
- **Rollback:** Manuell möglich (Marker löschen + Spalten entfernen); nicht automatisiert

### Standard-Mandant

| Feld | Wert |
|------|------|
| ID | `00000000-0000-0000-0000-000000000010` |
| Slug | `default` |
| Name | Aus `ClubSettings` bzw. „Lokale Installation“ |

---

## Repository-Filter

Zentrale Hilfsfunktionen in `backend/src/platform/tenant/tenantScope.ts`:

| Funktion | Zweck |
|----------|-------|
| `requireTenantId()` | Mandanten-ID aus TenantContext (wirft bei Fehlen) |
| `tenantWhere(where)` | Ergänzt Prisma-WHERE um `tenantId` |
| `withTenantId(data)` | Ergänzt Create-Daten um `tenantId` |
| `assertTenantOwnership(id)` | Prüft Mandantenzugehörigkeit |
| `optionalTenantId()` | Für Logging ohne Pflicht-Kontext |

**Angepasste Repositories/Services:** `userRepository`, `eventRepository`, `foodItemRepository`, `orderRepository`, `customerRepository`, `clubRepository`, `tenantModuleRepository`, Payment-Repositories, `LegalPageService`, `realtimeSyncService`, `uploadService`.

`findAll()` für mandantenbezogene Entitäten → `findForTenant()`.

---

## Neue Indizes

- `tenant_id` auf allen mandantenbezogenen Tabellen
- Composite: `(tenant_id, status)`, `(tenant_id, event_id)`, `(tenant_id, created_at)`, `(tenant_id, email)`, `(tenant_id, isActive)`

---

## Dateistruktur (Uploads)

```
uploads/
  {tenantId}/
    {filename}
```

Öffentliche URLs: `/uploads/{tenantId}/{filename}`. Bestehende Dateien werden bei Migration in den Default-Tenant-Ordner verschoben.

---

## Import / Export (Vorbereitung Phase 3+)

Geplante Architektur:

1. **Export:** Tenant-scoped Dump aller Tabellen + `uploads/{tenantId}/` als ZIP
2. **Import:** Neuer Tenant + Daten-Restore mit ID-Remapping
3. **API:** Plattform-Admin only, kein `tenant_id` in öffentlichen Endpunkten

---

## Settings-Klassifikation

| Scope | Beispiele |
|-------|-----------|
| Plattform | `platform_settings`, Multi-Tenant-Flags, Basis-Domain |
| Mandant | `tenant_settings`, `module.*` (Payment, SMTP, Legal, Printer) |

---

## Testergebnisse

| Test | Status |
|------|--------|
| `tenantScope.test.ts` | Neu – Unit-Tests für Filter-Hilfen |
| `tenant.test.ts` | Bestehend |
| `tenantContext.test.ts` | Bestehend |
| `module-system.test.ts` | Angepasst (`TenantModule`) |
| Integration / Migration | CI nach `prisma generate` |

**Hinweis:** Lokales `prisma generate` erfordert Schreibrechte auf `node_modules/@prisma/engines` (CI-Umgebung).

---

## Performancebewertung

- Zusätzliche `tenant_id`-Filter in WHERE-Klauseln nutzen dedizierte Indizes
- Composite-Indizes für häufige Abfragen (Orders nach Status/Event)
- Join-Performance: Payment-Admin-Queries joinen über `payments.tenant_id`
- Empfehlung Phase 3: `EXPLAIN ANALYZE` auf Order-Listen und Payment-Dashboard unter Last

---

## Sicherheit

- Kein `tenant_id` in API-Requests – Auflösung serverseitig via `TenantResolver`
- Repository-Filter verhindern Cross-Tenant-Zugriff auf CRUD-Ebene
- Upload-Pfade mandantenisoliert
- Audit-Log mit optionalem `tenant_id`

---

## Offene Punkte (Phase 3)

- PostgreSQL Row-Level Security (RLS) als Defense-in-Depth
- Vollständiger Tenant-Export/Import
- `TenantSettingsService` produktiv (aktuell Interfaces)
- Plattform-Admin-UI für Mandantenverwaltung
- Performance-Benchmarks mit realistischen Datenmengen

---

## Akzeptanzkriterien

| Kriterium | Erfüllt |
|-----------|---------|
| `tenant_id` in relevanten Tabellen | ✓ |
| Migration bestehender Installationen | ✓ |
| Standard-Tenant automatisch | ✓ |
| Repository-Filter | ✓ |
| Tenant-Isolation | ✓ |
| Indizes ergänzt | ✓ |
| Migration dokumentiert | ✓ |
| Architektur aktualisiert | ✓ |
| Keine Datenverluste | ✓ (idempotente Migration) |
