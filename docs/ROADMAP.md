# Roadmap — FestManager

Überblick: Was **heute stabil** ist und was **geplant** ist. Keine versteckten Experimente in der Hauptoberfläche.

Stand: Release **1.5.0**

---

## Stabil (1.4.0)

| Bereich | Funktion |
|---------|----------|
| Öffentlich | Bestellseite, Vorausbestellung, Status (per Lookup-Token), Kontakt, Abholboard, veröffentlichte Rechtsseiten (Impressum, Datenschutz, AGB, Widerruf) |
| Mitarbeiter | Küche, Abholung, Kasse, Dashboard, Bestellübersicht |
| Admin | Verein, Veranstaltungen, Speisen, Team, Bestell-Einstellungen, **Funktionen** (optionale Features ein/aus) |
| Einrichtung | Geführter **Einrichtungsassistent** (`/admin/einrichtung`: Verein → Veranstaltung → Speisekarte → Zahlungsart → Mitarbeiter) |
| Zahlung (UX) | **Zahlungs-Presets** (nur Bar / Bar+Karte / Online) im Assistenten und Payment-Admin |
| Team | **Rollen-Presets** (Vorstand, Küche, Kasse, Abholung, …) in der Benutzerverwaltung |
| Sicherheit | Bestellstatus nur mit Lookup-Token; Session-Widerruf bei Logout und deaktivierten Nutzern; Bild-Upload über Sharp (Typ, Größe, Neuencodierung) |
| Betrieb | Docker Compose, Schema-Sync per `prisma db push`, Backup- & Restore-Skripte |
| Module (optional) | Online-Zahlung (Stripe), Benachrichtigungen (E-Mail, ntfy, Chat), Bondruck, Rechtliche Informationen |
| API | Routen unter `/api/v1` (parallel zu `/api`) |
| Qualität | CI (Lint, Tests, E2E), Nightly QA, Security-Audit |

Vorschau-Module (Lager, Gutscheine, Analytics, …) sind im Code vorhanden, werden in der Admin-Oberfläche aber **nicht** angezeigt (`productionReady`-Filter).

---

## Geplant

| Thema | Beschreibung | Priorität |
|-------|--------------|-----------|
| Lagerverwaltung | Bestand pro Gericht — Modul `inventory` produktionsreif machen | Mittel |
| Weitere Module | Check-in, Gutscheine, Rabatte, Analytics nach Community-Bedarf | Niedrig |
| API-Integrationen | Öffentliche API dokumentieren, Stabilitätsversprechen für `/api/v1` | Niedrig |
| Admin-Navigation | Sekundäre Menüs weiter straffen, „Erweitert“-Bereich für Power-User | Niedrig |
| Multi-Instanz / Redis | Horizontale Skalierung (z. B. Socket.IO-Adapter) — nur bei nachgewiesenem Bedarf | Niedrig |

---

## Bewusst nicht (Kernprodukt)

- Drittanbieter-Plugin-Marketplace
- Multi-Mandanten-SaaS
- Vollständiges ERP (Lager, Loyalty, Analytics in der Haupt-UI ohne klaren Vereins-Use-Case)

Details und Begründung: [Maßnahmenplan](audits/massnahmenplan-architektur-produkt.md).

---

## Versionen

| Version | Fokus |
|---------|--------|
| **1.0** | Produktionsreifer Kern für Veranstaltunge |
| **1.4.0** | Rechtliche Informationen, UX-Vereinfachung (Funktionen, Presets, Assistent, Rollen-Presets), sichere Status-URLs & Sessions |
| 1.5+ | Lagerverwaltung und weitere Module nach Bedarf der Community |

Release-Notizen: [CHANGELOG.md](../CHANGELOG.md) · Vorlage: [RELEASE_NOTES_TEMPLATE.md](RELEASE_NOTES_TEMPLATE.md)
