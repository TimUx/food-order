# Vereinsbestellung

Moderne Webanwendung zur Verwaltung von Essensbestellungen bei Vereinsveranstaltungen.

## Funktionen

- **Öffentliche Bestellseite** – ohne Registrierung, mit Plus/Minus-Auswahl
- **Kundenstatusseite** – Live-Updates per WebSocket
- **Öffentliches Abholboard** – Vollbild-Anzeige für Monitore
- **Mitarbeiter-Dashboard** – Statistiken und Übersicht
- **Küchenansicht** – Tablet-optimiert mit großen Buttons
- **Kassenansicht** – Abholung per Tages-Bestellnummer
- **Lokale Kasse** – Bestellungen ohne Kundendaten
- **Speisenverwaltung** – CRUD mit Bild-Upload
- **Veranstaltungsverwaltung** – Mehrere Events, eine aktiv
- **PWA** – Installierbar auf Android, iOS, Windows, macOS

## Technologie-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | React, TypeScript, Vite, Material UI |
| Backend | Node.js, Express, TypeScript |
| Datenbank | PostgreSQL |
| ORM | Prisma |
| Realtime | Socket.IO |
| Deployment | Docker Compose |

## Schnellstart mit Docker

```bash
# Repository klonen und Umgebungsvariablen kopieren
cp .env.example .env

# Alle Container starten
docker compose up --build -d

# Datenbank seeden (einmalig)
docker compose exec backend npm run seed
```

Die Anwendung ist erreichbar unter:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001/api
- **Abholboard:** http://localhost:5173/abholboard

## Lokale Entwicklung

### Voraussetzungen

- Node.js 22+
- PostgreSQL 16+

### Backend

```bash
cd backend
cp ../.env.example .env
npm install
npx prisma migrate deploy
npm run seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

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
| `/status` | Status abfragen (Nummer + Nachname) |
| `/status/:orderId` | Live-Status nach Bestellung |
| `/abholboard` | Öffentliches Abholboard |

### Mitarbeiter (JWT erforderlich)

| Route | Beschreibung |
|-------|-------------|
| `/mitarbeiter/login` | Anmeldung |
| `/mitarbeiter` | Dashboard |
| `/mitarbeiter/bestellungen` | Bestellübersicht |
| `/mitarbeiter/kueche` | Küchenansicht |
| `/mitarbeiter/kasse` | Kassenansicht (Abholung) |
| `/mitarbeiter/lokale-kasse` | Lokale Kasse |
| `/mitarbeiter/speisen` | Speisenverwaltung (Admin) |
| `/mitarbeiter/veranstaltungen` | Veranstaltungsverwaltung (Admin) |

## Tages-Bestellnummer

Jede Veranstaltung beginnt täglich bei `001`. Die Nummer dient gleichzeitig als Bestell- und Abholnummer. Intern arbeitet das System mit UUIDs.

## Statusablauf

```
Neu → In Bearbeitung → Fertig → Abgeholt
                         ↓
                    Storniert
```

## Architektur

```
backend/
  src/
    config/         # Konfiguration & Datenbank
    controllers/    # HTTP-Controller
    services/       # Geschäftslogik
    repositories/   # Datenzugriff
    middleware/     # Auth, Validierung, Fehler
    validation/     # Zod-Schemas
    socket/         # Socket.IO
    routes/         # API-Routen

frontend/
  src/
    components/     # Wiederverwendbare UI-Komponenten
    contexts/       # Auth & Theme
    pages/          # Seiten (öffentlich & Mitarbeiter)
    services/       # API & Socket-Client
    types/          # TypeScript-Typen
```

## Tests

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

## E-Mail-Bestätigung

Optional über SMTP-Konfiguration in `.env`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=password
SMTP_FROM=noreply@verein.local
```

## Erweiterbarkeit

Die modulare Architektur ermöglicht zukünftige Erweiterungen wie QR-Codes, Bondruck, Zahlungsanbieter, mehrere Küchen, Push-Benachrichtigungen, CSV-Export und Mehrsprachigkeit.

## Lizenz

Proprietär – Vereinsnutzung
