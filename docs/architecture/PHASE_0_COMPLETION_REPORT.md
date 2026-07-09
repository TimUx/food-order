# Phase 0 – Abschlussbericht: Multi-Tenant Platform Architecture

| Feld | Wert |
|------|------|
| **Version** | 2.0 |
| **Phase** | 0 – Architektur & Multi-Tenant Foundation |
| **Branch** | `feature/v2-multi-tenant-platform` |
| **Datum** | 2026-07-09 |
| **Status** | ✅ Abgeschlossen |

---

## Zusammenfassung der Architektur

FestManager wird von einer Single-Tenant-Anwendung (ein Veranstalter pro Installation) zu einer **mandantenfähigen Plattform** weiterentwickelt:

```
Eine Installation → beliebig viele Veranstalter → beliebig viele Veranstaltungen → beliebig viele Benutzer
```

Phase 0 definiert ausschließlich das Zielbild und die Architekturentscheidungen. **Keine produktiven Codeänderungen** wurden vorgenommen.

### Zentrale Bausteine

| Baustein | Zweck |
|----------|-------|
| `TenantContext` | Request-scoped Mandanteninformation (AsyncLocalStorage) |
| `PlatformContext` | Plattformweite Konfiguration ohne Mandantendaten |
| `TenantResolver` | Einzige Stelle für Host-/Subdomain-/Prefix-Auflösung |
| Shared Database + `tenant_id` | Datenisolation in einer PostgreSQL-Instanz |
| Plattform-Administration | Getrennte Verwaltung unter `festmanager.org/platform` |
| `TenantProvider` (Frontend) | Ersetzt `ClubContext`; kein Host-Parsing in React |

### ADRs erstellt

| Nr. | Dokument | Inhalt |
|-----|----------|--------|
| 020 | [multi-tenant-platform.md](./020-multi-tenant-platform.md) | Gesamtzielbild, Modulanalyse, Teststrategie, Architekturreview |
| 021 | [tenant-context.md](./021-tenant-context.md) | TenantContext & PlatformContext |
| 022 | [platform-administration.md](./022-platform-administration.md) | Plattform-Administration |
| 023 | [tenant-routing.md](./023-tenant-routing.md) | TenantResolver, Routing-Prioritäten |
| 024 | [tenant-data-model.md](./024-tenant-data-model.md) | Datenmodell, Migration |
| 025 | [platform-settings.md](./025-platform-settings.md) | Plattform- vs. Mandanteneinstellungen |
| 026 | [multi-tenant-security.md](./026-multi-tenant-security.md) | Sicherheitskonzept |
| 027 | [multi-tenant-deployment.md](./027-multi-tenant-deployment.md) | Docker, Traefik, CORS |

---

## Getroffene Entscheidungen

| Entscheidung | Begründung |
|--------------|------------|
| **Shared Database, Shared Schema** | Einfacher Betrieb, ein Backup, eine Migration – ausreichend für Vereins-SaaS |
| **`tenant_id` auf allen Mandantentabellen** | Application-Level-Isolation; optional RLS in Phase 3 |
| **Kein `tenant_id` in API-Requests** | Schutz vor Cross-Tenant-Angriffen |
| **Subdomain primär, URL-Prefix optional** | Beste UX (`asv-libelle.festmanager.org`); Prefix für Nutzer ohne DNS |
| **Getrennte Plattform-Administration** | Klare Verantwortlichkeiten; keine Vermischung mit Mandanten-Admin |
| **TenantResolver als einzige Auflösungsstelle** | Wartbarkeit; Module bleiben mandantenagnostisch |
| **Kein `Domain=.festmanager.org` Auth-Cookie** | Verhindert Cross-Tenant-Session-Leak |
| **Traefik mit Wildcard-TLS** | Docker-native; Let's Encrypt für `*.domain` |
| **Standard-Mandant bei Migration** | Kein Datenverlust; Abwärtskompatibilität |
| **UI-Begriff „Veranstalter“** | Keine Verwirrung für Endnutzer; „Mandant“ nur intern |

---

## Architekturreview – Ergebnis

| Kriterium | Bewertung |
|-----------|-----------|
| Modular | ✅ Integriert in Modulsystem und FeatureContext |
| Wartbar | ✅ Ein Resolver, ein Context |
| Erweiterbar | ✅ Custom Domains, Redis, RLS als spätere Phasen |
| Performant | ⚠️ Indizes + Cache ausreichend; Redis in Phase 2 |
| Sicher | ✅ Mit Defense-in-Depth (Repository-Filter, Host-Validierung, CORS) |

Eingearbeitete Verbesserungen:
- `AsyncLocalStorage` statt `req.tenant`
- Negative Cache für unbekannte Subdomains
- Zusammengesetzte DB-Indizes `(tenant_id, …)`
- `requireTenant()` für geschützte Routen
- Feature-Flag `MULTI_TENANT_ENABLED` für schrittweise Aktivierung

---

## Akzeptanzkriterien

| Kriterium | Status |
|-----------|--------|
| Feature Branch erstellt | ✅ `feature/v2-multi-tenant-platform` |
| ADRs vollständig erstellt (020–027) | ✅ |
| TenantContext definiert | ✅ ADR-021 |
| PlatformContext definiert | ✅ ADR-021 |
| TenantResolver definiert | ✅ ADR-023 |
| Plattformverwaltung geplant | ✅ ADR-022 |
| Datenbankstrategie festgelegt | ✅ ADR-024 |
| Docker-Konzept dokumentiert | ✅ ADR-027 |
| CORS-Konzept dokumentiert | ✅ ADR-026, ADR-027 |
| Routing-Konzept dokumentiert | ✅ ADR-023 |
| Sicherheitskonzept dokumentiert | ✅ ADR-026 |
| Migrationsstrategie dokumentiert | ✅ ADR-024 |
| Architekturreview abgeschlossen | ✅ ADR-020 |
| Keine produktiven Codeänderungen | ✅ Nur Dokumentation |
| Dokumentation aktualisiert | ✅ README, Guides, Module-Doku |
| Commit erstellt | ✅ |

---

## Offene Punkte

| Punkt | Phase | Priorität |
|-------|-------|-----------|
| `TenantContext`-Implementierung | 1 | Hoch |
| Prisma-Schema mit `tenants`, `tenant_id` | 1 | Hoch |
| Standard-Mandant-Migrations-Skript | 1 | Hoch |
| `ClubSettings` → `TenantSettings` | 1 | Hoch |
| Plattform-Admin UI | 2 | Hoch |
| Dynamische CORS aus PlatformSettings | 2 | Mittel |
| Traefik im docker-compose.yml | 3 | Mittel |
| `TenantProvider` im Frontend | 3 | Mittel |
| Redis für Resolver-Cache + Socket.IO | 4 | Mittel |
| Custom Domains pro Mandant | 5 | Niedrig |
| Mandanten-Self-Registration | 5 | Niedrig |
| PostgreSQL Row-Level Security | 3+ | Niedrig |
| `emailService` vs. Notifications-Modul (ADR-002) | unabhängig | Niedrig |

---

## Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Cross-Tenant-Datenleck | Mittel | Kritisch | Repository-Enforcement, Tests, Code-Review |
| Migrations-Datenverlust | Niedrig | Kritisch | Backup-Pflicht, idempotente Skripte, Staging |
| Wildcard-DNS nicht verfügbar | Mittel | Mittel | URL-Prefix-Fallback |
| Performance bei vielen Mandanten | Niedrig | Mittel | Indizes, Cache, Redis |
| Cookie/Auth-Komplexität | Mittel | Hoch | Scope-Trennung, keine Domain-Cookies |
| Traefik-Fehlkonfiguration | Mittel | Hoch | Beispiel-Compose, Dokumentation |

---

## Auswirkungen auf Version 2.0

| Bereich | Auswirkung |
|---------|------------|
| **Datenbank** | Neue Tabellen, `tenant_id` auf bestehenden Tabellen, Migration |
| **Backend** | Neue Middleware, Context, Resolver; alle Repositories anpassen |
| **Frontend** | `TenantProvider`, ggf. dynamisches `basename`; Plattform-Admin-Bereich |
| **Module** | Mandantenscharfe Config und Tabellen; `FeatureContext.getTenantId()` |
| **Docker** | Traefik, Wildcard-TLS, Upload-Unterverzeichnisse |
| **Auth** | Scope-Trennung platform/tenant; Session pro Subdomain |
| **Tests** | Standard-Mandant-Fixtures; Cross-Tenant-Isolationstests |
| **Dokumentation** | Betreiber müssen Wildcard-DNS verstehen (ab Phase 3) |
| **Bestehende Nutzer** | Transparente Migration zu Standard-Mandant; UX unverändert |

---

## Vorbereitung für Phase 1

**Ziel:** Technische Foundation ohne sichtbare Multi-Tenant-Funktionen für Endnutzer.

### Empfohlene Reihenfolge

1. Prisma-Schema: `Tenant`, `TenantSettings`, `PlatformSettings`
2. Migrations-Skript: Standard-Mandant aus `ClubSettings`
3. `tenant_id` auf Core-Tabellen (nullable → befüllen → NOT NULL)
4. `TenantContext` + `PlatformContext` mit AsyncLocalStorage
5. `TenantResolver` mit Default-Mandant-Fallback (`localhost`, `MULTI_TENANT_ENABLED=false`)
6. `TenantScopedRepository`-Basisklasse
7. `FeatureContext.getTenantId()` ergänzen
8. Test-Fixtures anpassen
9. Feature-Flag `MULTI_TENANT_ENABLED`

### Erfolgskriterium Phase 1

Bestehende Single-Tenant-Installation funktioniert unverändert. Alle Daten gehören dem Standard-Mandanten. Keine Cross-Tenant-Leaks in automatisierten Tests.

---

## Geänderte Dokumentation (Phase 0)

| Dokument | Änderung |
|----------|----------|
| `docs/architecture/README.md` | ADRs 020–027, v2.0-Sektion |
| `docs/architecture/MIGRATION_PLAN.md` | v2.0-Phasenplan |
| `README.md` | Hinweis v2.0 Multi-Tenant |
| `docs/DEVELOPER_GUIDE.md` | Multi-Tenant-Sektion, Teststrategie |
| `docs/ADMIN_GUIDE.md` | Plattform- vs. Veranstalter-Admin |
| `docs/OPERATIONS.md` | Wildcard-DNS, Traefik-Hinweis |
| `docs/MODULE_ARCHITECTURE.md` | Multi-Tenant Best Practices |

---

*Phase 0 gilt als abgeschlossen. Alle Akzeptanzkriterien sind erfüllt.*
