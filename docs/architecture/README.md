# Architektur-Dokumentation

Technische Architektur der FestManager-Plattform – Architecture Decision Records (ADRs), Projektanalyse und Migrationsplan.

> **Stand:** Plattform **v2.0.0** — Multi-Tenant produktionsbereit (Phasen 0–10 abgeschlossen). v1.4.0 – Payment, Notifications, Legal, metadata-first Admin-UI.

## Dokumente

| Dokument | Inhalt |
|----------|--------|
| [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md) | Vollständige Ist-Analyse (Frontend, Backend, DB, Docker, API, Module, Risiken) |
| [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) | Phasenplan zur Zielarchitektur |
| [PAYMENT_6.5_REPORT.md](./PAYMENT_6.5_REPORT.md) | Release-Validierung Payment-Modul (Spec 6.5) |
| [001–014 ADRs](#architecture-decision-records) | Architekturentscheidungen und Zielbilder |

## Architecture Decision Records

| Nr. | ADR | Status | Kurzbeschreibung |
|-----|-----|--------|------------------|
| 001 | [platform-overview.md](./001-platform-overview.md) | Accepted | Gesamtplattform, Schichten, Deployment |
| 002 | [core-architecture.md](./002-core-architecture.md) | Accepted | Core-Prinzipien, Schichtenmodell, Extension Points |
| 003 | [module-system.md](./003-module-system.md) | Accepted | ModuleManager, Lifecycle, Discovery |
| 004 | [settings-platform.md](./004-settings-platform.md) | Accepted | Einheitliche Konfigurationsplattform |
| 005 | [permission-system.md](./005-permission-system.md) | Accepted | Rollen + Modulberechtigungen |
| 006 | [admin-ui.md](./006-admin-ui.md) | Accepted | Metadata-first Admin-Oberfläche |
| 007 | [payment-module.md](./007-payment-module.md) | Accepted | Payment, PayableResource, Stripe |
| 008 | [notification-module.md](./008-notification-module.md) | Accepted | Benachrichtigungen (E-Mail, Push, ntfy) |
| 009 | [printing-module.md](./009-printing-module.md) | Accepted | Bondruck Küche/Kasse |
| 010 | [developer-sdk.md](./010-developer-sdk.md) | Proposed | SDK für Modul- und Integrationsentwickler |
| 011 | [quality-assurance.md](./011-quality-assurance.md) | Accepted | Automatisierte QS- und CI-Plattform |
| 012 | [architecture-consolidation-review.md](./012-architecture-consolidation-review.md) | Accepted | Konsolidierungsreview: UX vs. Architektur |
| 013 | [realtime-communication.md](./013-realtime-communication.md) | Accepted | RealtimeService, WS-Fallback, intelligentes Polling |
| 014 | [legal-module.md](./014-legal-module.md) | Accepted | Optionales Modul für rechtliche Seiten, Footer-Links und Notification-Anbindung |
| 020 | [multi-tenant-platform.md](./020-multi-tenant-platform.md) | Accepted (Phase 0) | Gesamtzielbild Multi-Tenant-Plattform |
| 021 | [tenant-context.md](./021-tenant-context.md) | Accepted (Phase 0) | TenantContext & PlatformContext |
| 022 | [platform-administration.md](./022-platform-administration.md) | Accepted (Phase 0) | Plattform-Administration |
| 023 | [tenant-routing.md](./023-tenant-routing.md) | Accepted (Phase 0) | TenantResolver & Routing |
| 024 | [tenant-data-model.md](./024-tenant-data-model.md) | Accepted (Phase 0) | Shared DB, Tenant-Entity, Migration |
| 025 | [platform-settings.md](./025-platform-settings.md) | Accepted (Phase 0) | Plattform- vs. Mandanteneinstellungen |
| 026 | [multi-tenant-security.md](./026-multi-tenant-security.md) | Accepted (Phase 0) | Sicherheitskonzept Multi-Tenant |
| 027 | [multi-tenant-deployment.md](./027-multi-tenant-deployment.md) | Accepted (Phase 0) | Docker, Traefik, Wildcard-TLS |
| 028 | [notification-tenant.md](./028-notification-tenant.md) | Accepted (Phase 7) | Mandanten-SMTP, Branding, Webhooks |
| 029 | [multi-tenant-security-hardening.md](./029-multi-tenant-security-hardening.md) | Accepted (Phase 8) | Security Review, Tenant-Härtung |
| 030 | [performance-scalability.md](./030-performance-scalability.md) | Accepted (Phase 9) | Performance, Lasttests, Skalierung |

### Version 2.0 – Multi-Tenant

| Dokument | Inhalt |
|----------|--------|
| [PHASE_0_COMPLETION_REPORT.md](./PHASE_0_COMPLETION_REPORT.md) | Abschlussbericht Phase 0 |
| [PHASE_1_COMPLETION_REPORT.md](./PHASE_1_COMPLETION_REPORT.md) | Abschlussbericht Phase 1 (Tenant Core) |
| [PHASE_2_COMPLETION_REPORT.md](./PHASE_2_COMPLETION_REPORT.md) | Abschlussbericht Phase 2 (Tenant Data) |
| [PHASE_3_COMPLETION_REPORT.md](./PHASE_3_COMPLETION_REPORT.md) | Abschlussbericht Phase 3 (Platform Admin) |
| [PHASE_4_COMPLETION_REPORT.md](./PHASE_4_COMPLETION_REPORT.md) | Abschlussbericht Phase 4 (Tenant-Aware Modules) |
| [PHASE_5_COMPLETION_REPORT.md](./PHASE_5_COMPLETION_REPORT.md) | Abschlussbericht Phase 5 (Frontend & Routing) |
| [PHASE_6_COMPLETION_REPORT.md](./PHASE_6_COMPLETION_REPORT.md) | Abschlussbericht Phase 6 (Deployment) |
| [PHASE_7_COMPLETION_REPORT.md](./PHASE_7_COMPLETION_REPORT.md) | Abschlussbericht Phase 7 (Notifications) |
| [PHASE_8_COMPLETION_REPORT.md](./PHASE_8_COMPLETION_REPORT.md) | Abschlussbericht Phase 8 (Security) |
| [PHASE_9_COMPLETION_REPORT.md](./PHASE_9_COMPLETION_REPORT.md) | Abschlussbericht Phase 9 (Performance) |
| [PHASE_10_COMPLETION_REPORT.md](./PHASE_10_COMPLETION_REPORT.md) | Abschlussbericht Phase 10 (QA & Release) |
| [030-performance-scalability.md](./030-performance-scalability.md) | ADR Performance & Skalierung |

Siehe auch: [architecture-consolidation-report.md](../audits/architecture-consolidation-report.md) – Abschlussbericht mit Bewertung aller Kritikpunkte.

## ADR-Format

Jede ADR enthält:

- Titel, Status, Ziel, Motivation
- Architekturentscheidung
- Vorteile, Nachteile, Alternativen
- Auswirkungen, Migrationsstrategie, Offene Punkte

## Verwandte Dokumentation

- [MODULE_ARCHITECTURE.md](../MODULE_ARCHITECTURE.md) – operative Modul-Doku
- [FRONTEND_GUIDE.md](../FRONTEND_GUIDE.md) – mandantenfähiges Frontend (Phase 5)
- [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md) – Entwicklerhandbuch
- [NOTIFICATION_GUIDE.md](./NOTIFICATION_GUIDE.md) – mandantenfähige Benachrichtigungen (Phase 7)
- [PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md) – Performance & Lasttests (Phase 9)

## Prinzip

```
Core kennt keine Plugins.
Plugins kennen den Core.
```

Dieses Prinzip durchzieht alle ADRs und begrenzt Core-Änderungen auf Extension Points.
