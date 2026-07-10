# ADR 040: Tenant Access Policy

## Status

Accepted (v2.2.2)

## Kontext

FestSchmiede ist mandantenfähig (Shared Database, `tenantId` auf Mandantendaten). Direkte `prisma.order` / `prisma.user` / … Zugriffe außerhalb der Repository-Schicht riskieren Cross-Tenant-Datenlecks, wenn `tenantWhere()` oder `requireTenantId()` fehlt.

## Entscheidung

### Repository-Policy

| Schicht | Regel |
|---------|--------|
| **Repositories** | Einzige kanonische Stelle für tenant-scoped Prisma-Zugriffe |
| **Services** | Nutzen Repositories; direkter Prisma-Zugriff nur in expliziter Allowlist |
| **Platform** | Cross-Tenant mit explizitem `tenantId` in WHERE |
| **Infrastructure** | Seed, Migrationen, Bootstrap – kein Request-Kontext |

### CI-Enforcement

`scripts/qa/tenant-prisma-guard.ts` scannt `backend/src` und `backend/modules`:

- Blockiert `prisma.<tenantModel>.` außerhalb der Allowlist (`tenant-prisma-policy.ts`)
- Scoped Services müssen `tenantWhere` / `requireTenantId` / `assertTenantOwnership` importieren
- Negative Fixture `scripts/qa/fixtures/tenant-guard-violation.ts` wird in Tests erkannt

### Tenant-scoped Models

`user`, `userSession`, `event`, `foodItem`, `order`, `orderStatus`, `dailyOrderCounter`, `customer`, `clubSettings`, `tenantModule`, `tenantSettings`, `legalPage`, `authLoginToken`

### Ausnahmen (Allowlist)

| Kategorie | Dateien | Begründung |
|-----------|---------|------------|
| Repositories | `src/repositories/*`, Modul-Repos | Nutzen `tenantWhere` / `requireTenantId` |
| Platform | `PlatformTenantAdminService`, `PlatformDashboardService`, … | Explizites `tenantId` aus Admin-Kontext |
| Scoped Services | `realtimeSyncService`, `authLoginTokenService`, `sessionService` | Performance/Spezialfälle mit Scope-Helpers |
| Infrastructure | `seed.ts`, `core/tenant/*` | Kein Mandanten-Request |

## Konsequenzen

- Neue ungescopte Queries brechen CI (`qa:lint` / `qa:tenant-guard`)
- Entwickler dokumentieren neue Allowlist-Einträge in `tenant-prisma-policy.ts` + PR-Beschreibung
- Globale Tabellen (`Role`, `PlatformUser`) sind nicht tenant-guarded

## Referenzen

- `scripts/qa/tenant-prisma-policy.ts`
- `backend/src/platform/tenant/tenantScope.ts`
- ADR 021 (Tenant Context), ADR 024 (Tenant Data Model)
