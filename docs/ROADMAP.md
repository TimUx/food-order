# Roadmap — FestManager

Überblick: Was **heute stabil** ist und was **geplant** ist. Keine versteckten Experimente in der Hauptoberfläche.

Stand: Release **2.0.0** — Multi-Tenant-Plattform

---

## Stabil (2.0.0)

| Bereich | Funktion |
|---------|----------|
| **Plattform** | Mandantenverwaltung, Monitoring, globale Einstellungen (`/platform`) |
| **Multi-Tenant** | Subdomain/Pfad-Routing, TenantContext, mandantengebundene Daten |
| Öffentlich | Bestellseite, Vorausbestellung, Status (per Lookup-Token), Kontakt, Abholboard, Rechtsseiten |
| Mitarbeiter | Küche, Abholung, Kasse, Dashboard, Bestellübersicht |
| Admin | Veranstalter, Veranstaltungen, Speisen, Team, Bestell-Einstellungen, **Funktionen** |
| Einrichtung | Geführter **Einrichtungsassistent** (`/admin/einrichtung`) |
| Sicherheit | Tenant-Isolation, JWT mit `tenantId`, Host-Validation, Rate Limits, Upload-Schutz |
| Betrieb | Docker Compose, Traefik, Schema-Sync, Backup & Restore |
| Module (optional) | Online-Zahlung, Benachrichtigungen, Bondruck, Rechtliche Informationen |
| Performance | DB-Indizes, k6-Lasttests, Monitoring, Frontend Code Splitting |
| Qualität | CI (Lint, Typecheck, Tests, E2E, Security, Performance) |

Vorschau-Module (Lager, Gutscheine, Analytics, …) sind im Code vorhanden, werden in der Admin-Oberfläche aber **nicht** angezeigt (`productionReady`-Filter).

---

## Geplant

| Thema | Beschreibung | Priorität |
|-------|--------------|-----------|
| Lagerverwaltung | Bestand pro Gericht — Modul `inventory` produktionsreif machen | Mittel |
| Redis-Adapter | Horizontale Skalierung für Socket.IO (SharedCache-Interface vorhanden) | Mittel |
| Weitere Module | Check-in, Gutscheine, Rabatte, Analytics nach Community-Bedarf | Niedrig |
| API-Stabilität | Öffentliche API dokumentieren, Stabilitätsversprechen für `/api/v1` | Niedrig |
| Admin-Navigation | Sekundäre Menüs weiter straffen, „Erweitert“-Bereich für Power-User | Niedrig |

---

## Bewusst nicht (Kernprodukt)

- Drittanbieter-Plugin-Marketplace
- Vollständiges ERP (Lager, Loyalty, Analytics in der Haupt-UI ohne klaren Vereins-Use-Case)

Details und Begründung: [Maßnahmenplan](audits/massnahmenplan-architektur-produkt.md).

---

## Versionen

| Version | Fokus |
|---------|--------|
| **1.0** | Produktionsreifer Kern für Veranstaltungen |
| **1.4.0** | Rechtliche Informationen, UX-Vereinfachung, sichere Status-URLs |
| **1.5.0** | Rebranding FestManager |
| **2.0.0** | Multi-Tenant-Plattform, Plattformadministration, Security & Performance |
| 2.1+ | Lagerverwaltung, Redis-Skalierung nach Bedarf |

Release-Notizen: [CHANGELOG.md](../CHANGELOG.md) · [release-notes-2.0.0.md](release-notes-2.0.0.md)
