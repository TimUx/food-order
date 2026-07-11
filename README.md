# FestSchmiede

Open-Source-Plattform für Veranstaltungs-Bestellungen: Vorausbestellung, Küche, Abholung, Kasse und Administration — mandantenfähig, Docker-basiert, als PWA nutzbar.

Ideal für Vereinsfeste, Schützenfeste und Veranstaltungen mit Speisenverkauf und Abholung.

## Screenshots

| Bestellseite | Kundenstatus | Abholboard |
|:---:|:---:|:---:|
| ![Bestellseite](docs/screenshots/01-bestellseite-monitor.png) | ![Status](docs/screenshots/02-kundenstatus.png) | ![Abholboard](docs/screenshots/04-abholboard-monitor.png) |

| Mitarbeiter-Dashboard | Küche (Tablet) | Admin |
|:---:|:---:|:---:|
| ![Dashboard](docs/screenshots/06-dashboard.png) | ![Küche](docs/screenshots/07-kuechenansicht-tablet.png) | ![Admin](docs/screenshots/16-admin-uebersicht.png) |

Weitere Bilder: [docs/screenshots/](docs/screenshots/README.md)

## Funktionen

- **Gäste:** Speisekarte, Vorausbestellung, Live-Status, Abholboard
- **Mitarbeiter:** Küchenmonitor, Abholung, Kassenbestellung, Bestellübersicht mit Bearbeitung
- **Administration:** Veranstaltungen, Speisekarte, Team & Rollen, Bestell-Einstellungen
- **Plattform:** Mehrere Mandanten (Vereine) auf einer Instanz
- **Optional:** Online-Zahlung, E-Mail/Push-Benachrichtigungen, Bondruck, Rechtstexte

## Schnellstart

```bash
curl -fsSL https://raw.githubusercontent.com/TimUx/FestSchmiede/v2.3.6/install.sh | bash
```

Oder nach Git-Clone: `./install.sh` — Details in der [Installationsanleitung](docs/INSTALLATION.md).

| Dienst | URL (lokal) |
|--------|-------------|
| Bestellseite | http://localhost:5173/ |
| Mitarbeiter | http://localhost:5173/mitarbeiter/login |
| Admin | http://localhost:5173/admin/login |
| Plattform | http://localhost:5173/platform/login |

## Dokumentation

| Ich bin… | Start hier |
|----------|------------|
| **Helfer:in / Vorstand** (ohne IT) | [Volunteer Guide](docs/VOLUNTEER_GUIDE.md) |
| **Admin** (Installation & Betrieb) | [Installation](docs/INSTALLATION.md) → [Admin Guide](docs/ADMIN_GUIDE.md) → [Operations](docs/OPERATIONS.md) |
| **Mitarbeiter** (Küche, Abholung) | [User Guide](docs/USER_GUIDE.md) |
| **Entwickler:in** | [Developer Guide](docs/DEVELOPER_GUIDE.md) · [ADRs](docs/architecture/README.md) |

Vollständiger Index: [docs/README.md](docs/README.md)

**Admin in drei Schritten:** Installieren → [Ersteinrichtung](docs/ADMIN_GUIDE.md#erste-schritte-nach-der-installation) → [Checkliste vor dem Fest](docs/OPERATIONS.md#vor-dem-sommerfest-checkliste)

## Technik

React · TypeScript · Node.js · PostgreSQL · Docker · Socket.IO (Echtzeit)

Versionshistorie: [CHANGELOG.md](CHANGELOG.md) · Sicherheit: [SECURITY.md](SECURITY.md)

## Lizenz & Mitwirkung

Siehe Repository-Lizenz. Beiträge: [CONTRIBUTING.md](CONTRIBUTING.md) · Support: [SUPPORT.md](SUPPORT.md)
