# FestSchmiede — Dokumentation

Drei Zielgruppen — wählen Sie Ihre Rolle:

| Rolle | Für wen | Einstieg |
|-------|---------|----------|
| **Ehrenamt** | Vorstand, Helfer:innen ohne IT | [Volunteer Guide](VOLUNTEER_GUIDE.md) |
| **Admin** | Technische Ansprechpartner:innen | [Installation](INSTALLATION.md) |
| **Entwickler:in** | Maintainer, Contributors | [Developer Guide](DEVELOPER_GUIDE.md) |

---

## Ehrenamt & Mitarbeiter

| Thema | Anleitung |
|-------|-----------|
| Fest vorbereiten & am Tag bedienen | [Volunteer Guide](VOLUNTEER_GUIDE.md) |
| Küche, Abholung, Kasse (Bedienung) | [User Guide](USER_GUIDE.md) |
| Checkliste vor dem Fest | [Operations — Vor dem Sommerfest](OPERATIONS.md#vor-dem-sommerfest-checkliste) |
| Am Veranstaltungstag | [Operations — Am Veranstaltungstag](OPERATIONS.md#am-veranstaltungstag) |

---

## Administratoren

**In drei Schritten:**

1. **[Installation](INSTALLATION.md)** — `./install.sh`, Docker, erste Anmeldung
2. **[Ersteinrichtung](ADMIN_GUIDE.md#erste-schritte-nach-der-installation)** — Verein, Event, Speisekarte, Team
3. **[Checkliste Veranstaltungstag](OPERATIONS.md#vor-dem-sommerfest-checkliste)** — Backup, Health, Tablets testen

| Weitere Themen | Anleitung |
|----------------|-----------|
| Admin-Oberfläche (alle Bereiche) | [Admin Guide](ADMIN_GUIDE.md) |
| Backup, Update, Restore | [Operations](OPERATIONS.md) |
| HTTPS / Reverse Proxy | [Admin Guide — Reverse Proxy](ADMIN_GUIDE.md#reverse-proxy-https) |
| Plattform-Mandanten | [Admin Guide — Plattform](ADMIN_GUIDE.md#plattform-administration-phase-3) |
| Optionale Module (Zahlung, Mail, Druck) | [Admin Guide — Funktionen](ADMIN_GUIDE.md) |

---

## Entwickler:innen

| Thema | Anleitung |
|-------|-----------|
| Lokale Entwicklung, Tests, Screenshots | [Developer Guide](DEVELOPER_GUIDE.md) |
| Architektur-Entscheidungen (ADRs) | [architecture/README.md](architecture/README.md) |
| Multi-Tenant & Deployment | [ADR-027](architecture/027-multi-tenant-deployment.md) |
| Modul-System | [ADR-003](architecture/003-module-system.md) · [ADR-041](architecture/041-module-api-v3.md) |
| Sicherheit | [SECURITY.md](../SECURITY.md) |
| Änderungshistorie | [CHANGELOG.md](../CHANGELOG.md) |

---

## Screenshots

UI-Vorschau: [screenshots/README.md](screenshots/README.md) · Neu erzeugen: `npm run screenshots` (siehe [Developer Guide](DEVELOPER_GUIDE.md#screenshots-generieren))
