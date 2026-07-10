# FestSchmiede

Moderne Open-Source-Plattform für Verkauf, Bestellung und Organisation von Veranstaltungen – mit Vorausbestellungen, Branding des Veranstalters, Echtzeit-Updates und PWA-Unterstützung.

> **Version 2.2.2** — Professioneller interaktiver Installations-Assistent (`./install.sh`). Siehe [Installationsanleitung](docs/INSTALLATION.md).

Ursprünglich für Vereine entwickelt, geeignet für Feuerwehren, Hilfsorganisationen, Sport- und Musikvereine, Schulen, Firmen, Kommunen, Foodtrucks und private Feste.

![Bestellseite](docs/screenshots/01-bestellseite-monitor.png)

## Multi-Tenant-Plattform (v2.0)

| Ebene | Beschreibung |
|-------|--------------|
| **Plattform** | Zentrale Verwaltung: Mandanten anlegen, Monitoring, globale Einstellungen (`/platform`) |
| **Mandant (Tenant)** | Eigenständiger Veranstalter mit Branding, Speisekarte, Bestellungen, Team |
| **Module** | Pro Mandant aktivierbar: Zahlung, Benachrichtigungen, Rechtliches, Druck |
| **Routing** | Subdomain (`feuerwehr.fest.example`) oder Pfad-Präfix (`fest.example/feuerwehr`) |
| **Homepage** | Öffentliche Marketing-Seite unter `www.<domain>` bzw. Apex-Domain – Landingpage, FAQ, Mandantenbewerbung |
| **Isolation** | Shared Database mit `tenantId`; APIs, JWT, Uploads und WebSockets mandantengebunden |

Technische Details: [Tenant Context ADR](docs/architecture/021-tenant-context.md) · [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) · [Security](SECURITY.md)

### Öffentliche Homepage & kanonisches Routing

| Host | Bereich |
|------|---------|
| `www.<platform-domain>` | Öffentliche Homepage (Landingpage, FAQ, Bewerbung, Rechtliches) |
| `app.<platform-domain>` | Plattformadministration (`/platform`) |
| `<tenant>.<platform-domain>` | Mandantenportal des Veranstalters |

Lokal (ohne Subdomains): Marketing unter `/`, Plattform unter `/platform/*`.

Die Domain wird ausschließlich über ENV/Docker konfiguriert (`PLATFORM_DOMAIN`, `WWW_SUBDOMAIN`, `APP_SUBDOMAIN`, …). Konkrete Domainnamen im Quellcode sind nicht hinterlegt.

## Funktionen auf einen Blick

| Bereich | Beschreibung |
|---------|-------------|
| **Öffentliche Bestellseite** | Ohne Registrierung, Vorausbestellungen, Kontakt-Link |
| **Kundenstatusseite** | Live-Status per WebSocket, Selbststornierung |
| **Abholboard** | Vollbild-Monitor für fertige Bestellungen |
| **Mitarbeiter-Dashboard** | Statistiken, Umsatz, beliebte Gerichte |
| **Küchenansicht** | Tablet-optimiert mit großen Buttons |
| **Abholung** | Abholung per Tages-Bestellnummer bestätigen |
| **Bestellung** | Bestellungen vor Ort aufgeben (ohne Kundendaten) |
| **Veranstalter** | Name, Logo, Kontaktdaten (Admin) |
| **Bestell-Einstellungen** | Pflichtfelder & Stornierungsfrist (Admin) |
| **Benachrichtigungen** | ntfy, Discord, Slack, Teams (Admin); E-Mail über zentralen Plattform-SMTP |
| **Rechtliche Informationen** | Optionales Modul für Impressum, Datenschutz, AGB und Widerruf |
| **Speisenverwaltung** | CRUD mit Bild-Upload (Admin) |
| **Veranstaltungsverwaltung** | Mehrere Events, eine aktiv (Admin) |
| **Modulverwaltung** | Optionale Funktionen ein- und ausschalten (Admin) |
| **Online-Zahlung** | Stripe-Checkout, Smart Payment, Admin-Dashboard (optional, Modul) |

## Vorausbestellungen

Kunden können **Tage oder Wochen vor** der Veranstaltung bestellen. Die Abholnummer (001, 002, …) bezieht sich auf den **Veranstaltungstag**.

## Branding des Veranstalters

Administratoren können unter **Veranstalter** (`/admin/verein`) konfigurieren:

- Name des Veranstalters und Logo (im Header sichtbar)
- Beschreibung, Ansprechpartner, E-Mail, Telefon, Adresse, Website
- Kontaktseite unter `/kontakt` mit Link von der Bestellseite

Ohne Konfiguration werden sinnvolle Standardwerte verwendet.

## Modulsystem & Online-Zahlung

Die Plattform unterstützt **optionale Module**, die mit dem Docker-Image ausgeliefert werden:

| Modul | Status | Beschreibung |
|-------|--------|--------------|
| **Online-Zahlung** | ✅ Vollständig | Stripe, Smart Payment, Admin unter `/admin/payment` |
| **Benachrichtigungen** | ✅ Vollständig | SMTP, ntfy, Discord, Slack, Teams |
| **Bondruck** | ✅ Vollständig | Küchen- und Kassenbondruck |
| **Rechtliche Informationen** | ✅ Vollständig | Impressum, Datenschutz, AGB, Widerruf mit Footer- und E-Mail-Links |
| Lagerverwaltung | 🔜 Geplant | Bestandsführung für Speisen |

**Wichtig:** Vereine mit ausschließlich Barzahlung an der Kasse müssen **kein Modul aktivieren**. Ohne aktiviertes Payment-Modul verhält sich die Plattform exakt wie zuvor.

Technische Details: [Modul-Architektur](docs/MODULE_ARCHITECTURE.md) · Admin-Anleitung: [Modulverwaltung](docs/ADMIN_GUIDE.md#modulverwaltung)

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

| Admin-Übersicht | Veranstalter | Bestell-Einstellungen |
|:---:|:---:|:---:|
| ![Admin](docs/screenshots/16-admin-uebersicht.png) | ![Veranstalter](docs/screenshots/13-vereinseinstellungen.png) | ![Bestell-Einstellungen](docs/screenshots/18-bestell-einstellungen.png) |

| Team | Veranstaltungen | Speisenverwaltung |
|:---:|:---:|:---:|
| ![Team](docs/screenshots/17-benutzerverwaltung.png) | ![Veranstaltungen](docs/screenshots/12-veranstaltungen.png) | ![Speisen](docs/screenshots/11-speisenverwaltung.png) |

| Funktionen | Payment-Administration (Übersicht) |
|:---:|:---:|
| ![Funktionen](docs/screenshots/20-modulverwaltung.png) | ![Payment-Admin](docs/screenshots/21-payment-admin.png) |

| Payment-Einstellungen (Tab) | Rechtliche Informationen |
|:---:|:---:|
| ![Payment-Einstellungen](docs/screenshots/22-payment-einstellungen.png) | ![Legal-Admin](docs/screenshots/23-legal-admin.png) |

| Legal-Seiten bearbeiten | Öffentliches Impressum |
|:---:|:---:|
| ![Legal-Seiten](docs/screenshots/24-legal-seiten.png) | ![Impressum](docs/screenshots/25-impressum.png) |

## Schnellstart

### Online-Installation (empfohlen, ohne Git-Clone)

```bash
curl -fsSL https://raw.githubusercontent.com/TimUx/FestSchmiede/v2.2.1/install.sh | bash
```

Alternativ mit `wget`:

```bash
wget -qO- https://raw.githubusercontent.com/TimUx/FestSchmiede/v2.2.1/install.sh | bash
```

Eigenes Zielverzeichnis (z. B. als root):

```bash
FESTSCHMIEDE_INSTALL_DIR=/opt/festschmiede curl -fsSL https://raw.githubusercontent.com/TimUx/FestSchmiede/v2.2.1/install.sh | bash
```

Der Installer lädt automatisch das Release-Archiv von GitHub herunter und startet den TUI-Assistenten. Details: [INSTALLATION.md](docs/INSTALLATION.md).

### Nach Git-Clone

```bash
git clone https://github.com/TimUx/FestSchmiede.git
cd FestSchmiede
./install.sh
```

### Manuell (Docker Compose)

```bash
git clone https://github.com/TimUx/FestSchmiede.git
cd FestSchmiede
cp .env.example .env
docker compose pull
docker compose up -d
docker compose exec backend npm run seed
```

Das Backend wendet beim Start versionierte Prisma-Migrationen an (`prisma migrate deploy`). Betrieb, Backup und Updates: [OPERATIONS.md](docs/OPERATIONS.md).

| Dienst | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Bestellseite | http://localhost:5173/ |
| Kontakt | http://localhost:5173/kontakt |
| Abholboard | http://localhost:5173/abholboard |
| Mitarbeiter-Login | http://localhost:5173/mitarbeiter/login |
| Admin-Login | http://localhost:5173/admin/login |

## Routen

### Öffentlich

| Route | Beschreibung |
|-------|-------------|
| `/` | Bestellseite |
| `/kontakt` | Kontaktdaten des Vereins |
| `/:legalSlug` | Veröffentlichte Rechtsseite (z. B. `/impressum`, `/datenschutz`) |
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
| `/admin/verein` | Veranstalter (Name, Logo, Kontakt) | ADMIN |
| `/admin/benutzer` | Team verwalten | ADMIN |
| `/admin/veranstaltungen` | Veranstaltungen | ADMIN |
| `/admin/speisen` | Speisenverwaltung | ADMIN |
| `/admin/bestellung` | Pflichtfelder & Stornierungsfrist | ADMIN |
| `/admin/email` | SMTP / Benachrichtigungen (Weiterleitung → Modul-Settings) | ADMIN |
| `/admin/module` | Funktionen (Zahlung, Benachrichtigungen, Rechtliches, Druck) | ADMIN |
| `/admin/payment` | Payment-Administration (Dashboard, Provider, Zahlungen) | ADMIN |
| `/admin/legal` | Rechtliche Informationen (Übersicht, Seiten, Einstellungen, Vorschau) | ADMIN |
| `/admin/settings/module.payment` | API-Schlüssel & Provider (alternativ Tab „Einstellungen“) | ADMIN |
| `/admin/settings/module.notifications` | E-Mail & Benachrichtigungskanäle | ADMIN |

> Legacy: `/admin/module/payment` → `/admin/payment` · `/admin/email` → `/admin/settings/module.notifications`

## Dokumentation

| Handbuch | Zielgruppe |
|----------|-----------|
| [Operations](docs/OPERATIONS.md) | Betreiber (Backup, Update, Restore) |
| [Volunteer Guide](docs/VOLUNTEER_GUIDE.md) | Ehrenamtliche ohne IT-Hintergrund |
| [Admin Guide](docs/ADMIN_GUIDE.md) | Administratoren |
| [User Guide](docs/USER_GUIDE.md) | Mitarbeiter (Küche, Abholung) |
| [Developer Guide](docs/DEVELOPER_GUIDE.md) | Entwickler |
| [Roadmap](docs/ROADMAP.md) | Stabil vs. geplant |
| [Modul-Architektur](docs/MODULE_ARCHITECTURE.md) | Entwickler (Module, Payment, PayableResource) |
| [Architektur & ADRs](docs/architecture/README.md) | Entwickler (ADR, Multi-Tenant v2.0) |
| [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) | Multi-Tenant-Betrieb (Docker, Traefik) |
| [Performance Guide](docs/architecture/PERFORMANCE_GUIDE.md) | Lasttests, Monitoring, Skalierung |
| [Notification Guide](docs/architecture/NOTIFICATION_GUIDE.md) | Mandanten-SMTP, Branding, Webhooks |

## Technologie-Stack

React · TypeScript · Vite · Material UI · Node.js · Express · Prisma · PostgreSQL · Socket.IO · Docker · PWA · Modulsystem · Stripe

## Docker Images

Fertige Images werden per GitHub Actions in die GitHub Container Registry veröffentlicht:

- `ghcr.io/timux/festschmiede/backend`
- `ghcr.io/timux/festschmiede/frontend`

Ausführung: manuell über Actions oder automatisch beim Erstellen eines Releases.

## Screenshots aktualisieren

```bash
cd frontend && npm run build
cd .. && npm install
npm run screenshots
```

Alle Screenshots werden mit **1920×1080**, **Light Theme** und einheitlichen Beispieldaten (*Feuerwehr Musterstadt*, *Sommerfest 2026*) erzeugt. API-Antworten werden per Mock bereitgestellt — siehe `scripts/capture-screenshots.ts`.

Optionale Umgebungsvariablen:

| Variable | Beschreibung |
|----------|-------------|
| `START_FROM` | Ab Screenshot-Namen fortsetzen (z. B. `16-admin-uebersicht`) |
| `SKIP_DEVICES` | `1` = Geräte-Mockups der Bestellseite überspringen |
| `FRONTEND_DIST` | Alternativer Pfad zu `frontend/dist` |

Voraussetzungen: Playwright (`npx playwright install chromium`) und Python 3 mit Pillow für Geräte-Mockups. Details siehe [Developer Guide](docs/DEVELOPER_GUIDE.md#screenshots-generieren).
