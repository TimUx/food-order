# Vereinsbestellung

Moderne Webanwendung zur Verwaltung von Essensbestellungen bei Vereinsveranstaltungen – mit Vorausbestellungen, Vereins-Branding, Echtzeit-Updates und PWA-Unterstützung.

![Bestellseite](docs/screenshots/01-bestellseite-monitor.png)

## Funktionen auf einen Blick

| Bereich | Beschreibung |
|---------|-------------|
| **Öffentliche Bestellseite** | Ohne Registrierung, Vorausbestellungen, Kontakt-Link |
| **Kundenstatusseite** | Live-Status per WebSocket |
| **Abholboard** | Vollbild-Monitor für fertige Bestellungen |
| **Mitarbeiter-Dashboard** | Statistiken, Umsatz, beliebte Gerichte |
| **Küchenansicht** | Tablet-optimiert mit großen Buttons |
| **Abholung** | Abholung per Tages-Bestellnummer bestätigen |
| **Bestellung** | Bestellungen vor Ort aufgeben (ohne Kundendaten) |
| **Vereinseinstellungen** | Name, Logo, Kontaktdaten, Benutzer (Admin) |
| **Speisenverwaltung** | CRUD mit Bild-Upload (Admin) |
| **Veranstaltungsverwaltung** | Mehrere Events, eine aktiv (Admin) |

## Vorausbestellungen

Kunden können **Tage oder Wochen vor** der Veranstaltung bestellen. Die Abholnummer (001, 002, …) bezieht sich auf den **Veranstaltungstag**.

## Vereins-Branding

Administratoren können unter **Verein** (`/admin/verein`) konfigurieren:

- Vereinsname und Logo (im Header sichtbar)
- Beschreibung, Ansprechpartner, E-Mail, Telefon, Adresse, Website
- Kontaktseite unter `/kontakt` mit Link von der Bestellseite

Ohne Konfiguration werden sinnvolle Standardwerte verwendet.

## Screenshots

### Öffentlicher Bereich

| Bestellseite (Monitor) | Bestellseite (iPhone) | Bestellseite (iPad) |
|:---:|:---:|:---:|
| ![Bestellseite Monitor](docs/screenshots/01-bestellseite-monitor.png) | ![Bestellseite iPhone](docs/screenshots/01-bestellseite-iphone.png) | ![Bestellseite iPad](docs/screenshots/01-bestellseite-ipad.png) |

| Kundenstatus | Status-Abfrage | Kontakt |
|:---:|:---:|:---:|
| ![Kundenstatus](docs/screenshots/02-kundenstatus.png) | ![Status-Abfrage](docs/screenshots/03-status-abfrage.png) | ![Kontakt](docs/screenshots/14-kontakt.png) |

### Monitore

| Abholboard (1920×1080) |
|:---:|
| ![Abholboard](docs/screenshots/04-abholboard-monitor.png) |

### Mitarbeiterbereich

| Dashboard | Küche (Tablet) | Abholung |
|:---:|:---:|:---:|
| ![Dashboard](docs/screenshots/06-dashboard.png) | ![Küche](docs/screenshots/07-kuechenansicht-tablet.png) | ![Abholung](docs/screenshots/08-abholung.png) |

| Bestellung | Bestellübersicht |
|:---:|:---:|
| ![Bestellung](docs/screenshots/09-bestellung.png) | ![Bestellungen](docs/screenshots/10-bestellungen.png) |

### Administrationsbereich

| Admin-Übersicht | Verein & Kontakt | Benutzerverwaltung |
|:---:|:---:|:---:|
| ![Admin](docs/screenshots/16-admin-uebersicht.png) | ![Verein](docs/screenshots/13-vereinseinstellungen.png) | ![Benutzer](docs/screenshots/17-benutzerverwaltung.png) |

| Veranstaltungen | Speisenverwaltung |
|:---:|:---:|
| ![Veranstaltungen](docs/screenshots/12-veranstaltungen.png) | ![Speisen](docs/screenshots/11-speisenverwaltung.png) |

## Schnellstart

```bash
git clone https://github.com/TimUx/food-order.git
cd food-order
cp .env.example .env
docker compose pull
docker compose up -d
docker compose exec backend npm run seed
```

Das Backend synchronisiert das Datenbankschema automatisch per `prisma db push` beim Start.

| Dienst | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Bestellseite | http://localhost:5173/ |
| Kontakt | http://localhost:5173/kontakt |
| Abholboard | http://localhost:5173/abholboard |
| Mitarbeiter-Login | http://localhost:5173/mitarbeiter/login |
| Admin-Login | http://localhost:5173/admin/login |

## Test-Zugangsdaten

| Rolle | E-Mail | Passwort |
|-------|--------|----------|
| Administrator | admin@verein.local | admin123 |
| Mitarbeiter (Küche) | kueche@verein.local | staff123 |

## Routen

### Öffentlich

| Route | Beschreibung |
|-------|-------------|
| `/` | Bestellseite |
| `/kontakt` | Kontaktdaten des Vereins |
| `/status` | Status abfragen |
| `/status/:orderId` | Live-Status |
| `/abholboard` | Abholboard für Monitore |

### Mitarbeiter

| Route | Beschreibung | Rolle |
|-------|-------------|-------|
| `/mitarbeiter/abholung` | Abholung bestätigen | ADMIN, STAFF |
| `/mitarbeiter/bestellung` | Bestellung vor Ort | ADMIN, STAFF |
| `/mitarbeiter/kueche` | Küchenansicht | ADMIN, STAFF |
| `/mitarbeiter/bestellungen` | Bestellübersicht | ADMIN, STAFF |

### Administration

| Route | Beschreibung | Rolle |
|-------|-------------|-------|
| `/admin` | Admin-Übersicht | ADMIN |
| `/admin/verein` | Vereinseinstellungen | ADMIN |
| `/admin/benutzer` | Benutzerverwaltung | ADMIN |
| `/admin/veranstaltungen` | Veranstaltungen | ADMIN |
| `/admin/speisen` | Speisenverwaltung | ADMIN |

> Alte Routen `/mitarbeiter/kasse`, `/mitarbeiter/lokale-kasse`, `/mitarbeiter/verein`, `/mitarbeiter/speisen` und `/mitarbeiter/veranstaltungen` leiten automatisch weiter.

## Dokumentation

| Handbuch | Zielgruppe |
|----------|-----------|
| [Developer Guide](docs/DEVELOPER_GUIDE.md) | Entwickler |
| [Admin Guide](docs/ADMIN_GUIDE.md) | Administratoren |
| [User Guide](docs/USER_GUIDE.md) | Mitarbeiter (Küche, Abholung) |

## Technologie-Stack

React · TypeScript · Vite · Material UI · Node.js · Express · Prisma · PostgreSQL · Socket.IO · Docker · PWA

## Docker Images

Fertige Images werden per GitHub Actions in die GitHub Container Registry veröffentlicht:

- `ghcr.io/timux/food-order/backend`
- `ghcr.io/timux/food-order/frontend`

Ausführung: manuell über Actions oder automatisch beim Erstellen eines Releases.

## Screenshots aktualisieren

```bash
cd frontend && npm run build
cd .. && npm run screenshots
```
