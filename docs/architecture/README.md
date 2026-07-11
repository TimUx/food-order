# Architektur (ADRs)

Architecture Decision Records für Maintainer und Contributors.

**Stand:** Plattform v2.2 — Multi-Tenant produktionsbereit.

## Wichtige ADRs

| Nr. | Dokument | Thema |
|-----|----------|-------|
| 001 | [platform-overview](./001-platform-overview.md) | Gesamtplattform |
| 002 | [core-architecture](./002-core-architecture.md) | Core, Extension Points |
| 003 | [module-system](./003-module-system.md) | ModuleManager, Lifecycle |
| 007 | [payment-module](./007-payment-module.md) | Zahlungsmodul |
| 020 | [multi-tenant-platform](./020-multi-tenant-platform.md) | Multi-Tenant |
| 023 | [tenant-routing](./023-tenant-routing.md) | Routing & Frontend |
| 027 | [multi-tenant-deployment](./027-multi-tenant-deployment.md) | Deployment |
| 030 | [performance-scalability](./030-performance-scalability.md) | Performance |
| 039 | [production-migrations](./039-production-migrations.md) | Prisma Migrate |
| 040 | [tenant-access-policy](./040-tenant-access-policy.md) | Tenant-scoped DB |
| 041 | [module-api-v3](./041-module-api-v3.md) | Modul-Runtime API |
| 043 | [tenant-role-templates](./043-tenant-role-templates.md) | Rollenvorlagen |
| 044 | [guided-operations](./044-guided-operations.md) | Installer-Ops |
| 045 | [security-hardening-baseline](./045-security-hardening-baseline.md) | Security |

## Alle ADRs

Dateien `001`–`045` in diesem Ordner (Module, Settings, Notifications, Installer, …).

## Handbücher

- [docs/README.md](../README.md) — Dokumentations-Index
- [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md) — Entwicklung & Betrieb

## Prinzip

```
Core kennt keine Plugins.
Plugins kennen den Core.
```
