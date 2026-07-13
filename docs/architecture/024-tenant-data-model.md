# ADR-024: Tenant Data Model

| Feld | Wert |
|------|------|
| **Status** | Implemented (Phase 2) |
| **Datum** | 2026-07-09 |
| **Version** | 2.0 |
| **Abhängigkeiten** | ADR-020, ADR-021, ADR-004 |

## Problem

Das aktuelle Datenmodell (`backend/prisma/schema.prisma`) kennt keinen Mandantenbegriff. `ClubSettings` mit fester ID `default`, globale `User`-Tabelle und mandantenlose `Event`/`Order`-Tabellen verhindern Datenisolation zwischen Veranstaltern.

## Motivation

Alle Mandanten sollen auf **einer PostgreSQL-Instanz** mit **einem Schema** arbeiten. Die Isolation erfolgt über `tenant_id` auf mandantenbezogenen Tabellen – einfach zu betreiben, zu sichern und zu migrieren.

## Entscheidung

### Datenbankstrategie

| Aspekt | Entscheidung |
|--------|--------------|
| Datenbanken pro Mandant | **Nein** |
| Schemas pro Mandant | **Nein** |
| Strategie | **Shared Database, Shared Schema** |
| Isolation | `tenant_id` auf allen mandantenbezogenen Tabellen |
| Durchsetzung | Application-Level (Repositories) + optional RLS (Phase 3) |

### Tenant-Entity

**Geplantes Prisma-Modell:**

```prisma
enum TenantStatus {
  PENDING
  ACTIVE
  SUSPENDED
  ARCHIVED
}

model Tenant {
  id              String       @id @default(uuid())
  name            String       // Anzeigename (UI: Veranstalter)
  shortName       String?      @map("short_name")
  slug            String       @unique  // URL-Pfad, z. B. asv-libelle
  subdomain       String       @unique  // z. B. asv-libelle
  status          TenantStatus @default(PENDING)
  contactName     String?      @map("contact_name")
  email           String?
  phone           String?
  logoUrl         String?      @map("logo_url")
  locale          String       @default("de-DE")
  timezone        String       @default("Europe/Berlin")
  currency        String       @default("EUR")
  theme           String       @default("default")
  activatedAt     DateTime?    @map("activated_at")
  archivedAt      DateTime?    @map("archived_at")
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  // Relationen
  users           TenantUser[]
  events          Event[]
  settings        TenantSettings?
  installedModules TenantModule[]

  @@index([status])
  @@index([subdomain])
  @@map("tenants")
}
```

### Tabellenkategorien

| Kategorie | Tabellen | `tenant_id` |
|-----------|----------|-------------|
| **Plattform** | `platform_settings`, `platform_audit_log`, `platform_users` | Nein |
| **Mandant (Stamm)** | `tenants`, `tenant_settings` | – / implizit |
| **Mandant (Daten)** | `events`, `orders`, `food_items`, `customers`, `users` (→ `tenant_users`), `legal_pages`, Modul-Tabellen | **Ja** |
| **Shared Reference** | `roles` (umbenannt/gesplittet) | Teilweise |

### Mandantenbezogene Tabellen (Migration)

Folgende bestehende Tabellen erhalten `tenant_id`:

| Tabelle | Anmerkung |
|---------|-----------|
| `Event` | Direkt mandantengebunden |
| `Order`, `OrderItem`, `OrderStatus` | Über Event oder direkt |
| `FoodItem` | Mandantenweiter Speisen-Katalog |
| `EventFoodItem` | Zuordnung Speise ↔ Veranstaltung (`soldOut` pro Event) |
| `Customer` | Mandantenisoliert (gleiche E-Mail in zwei Mandanten erlaubt) |
| `DailyOrderCounter` | Über Event |
| `ClubSettings` | Wird zu `TenantSettings` (1:1 pro Mandant) |
| `LegalPage` | Pro Mandant eigene Rechtsseiten |
| `InstalledModule` | Wird zu `TenantModule` (Modulstatus pro Mandant) |
| `User` | Wird zu `TenantUser` mit `tenantId`; Plattform-Admins separat |

**Unique-Constraints anpassen:**

| Alt | Neu |
|-----|-----|
| `User.email @unique` | `@@unique([tenantId, email])` |
| `LegalPage.slug @unique` | `@@unique([tenantId, slug])` |
| `Order @@unique([eventId, orderDate, orderNumber])` | Unverändert (Event ist mandantengebunden) |

### TenantSettings (ersetzt ClubSettings)

```prisma
model TenantSettings {
  tenantId                    String   @id @map("tenant_id")
  tenant                      Tenant   @relation(fields: [tenantId], references: [id])
  // Alle bisherigen ClubSettings-Felder
  orderFieldFirstNameRequired Boolean  @default(true)
  // ... SMTP, Bestellfelder, dataRetentionDays
  updatedAt                   DateTime @updatedAt

  @@map("tenant_settings")
}
```

Settings-Namespaces werden angepasst:

| Alt | Neu |
|-----|-----|
| `core.club` | `tenant.organization` |
| `core.order` | `tenant.order` |
| `core.email` | `tenant.email` (oder Modul notifications) |
| `module.{id}` | `tenant.module.{id}` |

### Indizes

Jede mandantenbezogene Tabelle erhält mindestens:

```prisma
@@index([tenantId])
```

Zusammengesetzte Indizes für häufige Queries:

```prisma
@@index([tenantId, status])        // Order
@@index([tenantId, isActive])      // Event
@@index([tenantId, email])         // TenantUser
```

### Benutzermodell

```
PlatformUser          TenantUser
├── id                ├── id
├── email (unique)    ├── tenantId
├── passwordHash      ├── email (unique per tenant)
├── role: PLATFORM_ADMIN ├── roleId (ADMIN/STAFF)
└── ...               └── ...
```

Ein Benutzer kann in mehreren Mandanten Mitglied sein (separate `TenantUser`-Einträge).

### Modul-Daten

`InstalledModule` wird mandantenscharf:

```prisma
model TenantModule {
  tenantId         String
  moduleId         String
  // ... bisherige InstalledModule-Felder
  @@id([tenantId, moduleId])
}
```

Modul-eigene Tabellen (payment, legal, …) erhalten `tenant_id` in ihren SQL-Migrationen.

## Migrationsstrategie

### Ziel

Bestehende Single-Tenant-Installationen erhalten automatisch **einen Standard-Mandanten**. Es dürfen **keinerlei Daten verloren gehen**.

### Phasen

| Phase | Schritt | Beschreibung |
|-------|---------|--------------|
| M1 | Schema-Erweiterung | `tenants`, `tenant_settings`, `platform_settings` anlegen |
| M2 | Standard-Mandant | Aus `ClubSettings` (id=`default`) Tenant mit `slug=default`, `subdomain=default` erzeugen |
| M3 | `tenant_id` hinzufügen | Nullable `tenant_id` auf alle mandantenbezogenen Tabellen |
| M4 | Daten befüllen | `UPDATE … SET tenant_id = '<default-tenant-id>'` |
| M5 | NOT NULL | `tenant_id` auf NOT NULL setzen |
| M6 | Constraints | Unique-Indexes anpassen, alte Constraints entfernen |
| M7 | Aufräumen | `ClubSettings` deprecaten; View/Alias für Übergang |
| M8 | Plattform-Admin | Initialen `PlatformUser` aus erstem `ADMIN` erzeugen (optional, konfigurierbar) |

### Migrations-Skript (Konzept)

```sql
-- M2: Standard-Mandant
INSERT INTO tenants (id, name, slug, subdomain, status, activated_at, created_at)
SELECT gen_random_uuid(), club_name, 'default', 'default', 'ACTIVE', NOW(), NOW()
FROM club_settings WHERE id = 'default';

-- M4: Events zuordnen
UPDATE events SET tenant_id = (SELECT id FROM tenants WHERE slug = 'default');
```

### Rollback

- Migration ist in Transaktionen pro Phase
- Backup-Pflicht vor Migration (dokumentiert in OPERATIONS.md)
- Feature-Flag `MULTI_TENANT_ENABLED=false` → Resolver nutzt immer Default-Mandant

### Entwicklungsumgebung

- `prisma migrate` statt `db push` für v2-Migrationen (ADR-002 offener Punkt)
- Seed erstellt Standard-Mandant + Demo-Daten mandantengebunden

## Alternativen

| Alternative | Bewertung |
|-------------|-----------|
| Database-per-Tenant | Starke Isolation, aber N× Backup, N× Migration → abgelehnt |
| Schema-per-Tenant | Prisma unterstützt nicht nativ Multi-Schema pro Request → abgelehnt |
| Separate `ClubSettings`-Zeilen pro Mandant ohne `tenants`-Tabelle | Kein Resolver-Lookup, keine Statusverwaltung → abgelehnt |
| PostgreSQL RLS allein | Schützt DB, aber nicht API-Logik → nur ergänzend |

## Auswirkungen

- Alle Repositories müssen `tenant_id` filtern (Phase 1)
- Prisma-Middleware optional für automatischen Filter
- Modul-Migrationen müssen `tenant_id` in neuen Tabellen berücksichtigen
- Backup/Restore bleibt eine Datenbank (vereinfacht gegenüber Multi-DB)
- Datenexport pro Mandant über `WHERE tenant_id = ?` möglich

## Risiken

| Risiko | Mitigation |
|--------|------------|
| Datenverlust bei Migration | Backup-Pflicht; idempotente Skripte; Staging-Test |
| Vergessener `tenant_id`-Filter | Repository-Basisklasse; Integrationstests |
| Unique-Constraint-Konflikte | Migration in Phasen; nullable zuerst |
| Große Tabellen bei UPDATE | Batch-Updates; Index erst nach Befüllung |

## Performance

| Aspekt | Maßnahme |
|--------|----------|
| Query-Performance | Zusammengesetzte Indizes `(tenant_id, …)` |
| Tabellengröße | Partitionierung nach `tenant_id` erst bei >10M Zeilen evaluieren |
| Connection Pool | Unverändert (eine DB) |
| Caching | Tenant-Metadaten im Resolver-Cache |

## Spätere Erweiterungen

- PostgreSQL Row-Level Security als Defense-in-Depth
- Mandanten-Export (SQL-Dump gefiltert)
- Read Replicas für Reporting
- Archivierung: Mandantendaten in Cold Storage

## Verwandte ADRs

- [020 – Multi-Tenant Platform](./020-multi-tenant-platform.md)
- [021 – Tenant Context](./021-tenant-context.md)
- [004 – Settings Platform](./004-settings-platform.md)
