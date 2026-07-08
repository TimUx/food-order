# Administratorhandbuch (Admin Guide)

Anleitung für Administratoren der Vereinsbestellplattform mit Vollzugriff auf alle Funktionen – von der Installation bis zum Veranstaltungstag.

## Inhaltsverzeichnis

1. [Installation](#installation)
2. [Konfiguration](#konfiguration)
3. [Erste Schritte nach der Installation](#erste-schritte-nach-der-installation)
4. [Veranstaltungen verwalten](#veranstaltungen-verwalten)
5. [Vorausbestellungen aktivieren](#vorausbestellungen-aktivieren)
6. [Speisen verwalten](#speisen-verwalten)
7. [Bestellungen überwachen](#bestellungen-überwachen)
8. [Vereinseinstellungen](#vereinseinstellungen)
9. [Mitarbeiter & Rollen](#mitarbeiter--rollen)
10. [Schalter & Einstellungen](#schalter--einstellungen)
11. [Abholboard einrichten](#abholboard-einrichten)
12. [E-Mail-Benachrichtigungen](#e-mail-benachrichtigungen)
13. [Checkliste am Veranstaltungstag](#checkliste-am-veranstaltungstag)
14. [FAQ](#faq)
15. [Troubleshooting](#troubleshooting)

---

## Installation

### Voraussetzungen

| Anforderung | Empfehlung |
|-------------|------------|
| Server / PC | Linux, Windows oder macOS mit Docker |
| Docker | Docker Engine 24+ und Docker Compose v2 |
| Netzwerk | Port 5173 (Frontend) und 3001 (API) erreichbar |
| Browser | Aktueller Chrome, Firefox, Safari oder Edge |

> **Hinweis:** Für den produktiven Betrieb empfiehlt sich ein Reverse Proxy (z. B. nginx, Caddy) mit HTTPS vor dem Frontend.

### Installation mit Docker (empfohlen)

```bash
git clone https://github.com/TimUx/food-order.git
cd food-order
cp .env.example .env
docker compose up --build -d
docker compose exec backend npm run seed
```

Das Backend synchronisiert das Datenbankschema beim Start automatisch per `prisma db push`.

### Prüfen, ob alles läuft

```bash
docker compose ps
```

Alle drei Dienste (`postgres`, `backend`, `frontend`) sollten den Status **running** haben.

| Dienst | URL | Beschreibung |
|--------|-----|--------------|
| Frontend | http://localhost:5173 | Öffentliche Bestellseite |
| Bestellseite | http://localhost:5173/ | Kundenbestellungen |
| Kontakt | http://localhost:5173/kontakt | Vereinskontakt |
| Abholboard | http://localhost:5173/abholboard | Monitor-Anzeige |
| Mitarbeiter-Login | http://localhost:5173/mitarbeiter/login | Admin- und Mitarbeiterbereich |
| API (intern) | http://localhost:3001/api/health | Gesundheitscheck |

### Docker-Images aus der Registry (optional)

Fertige Images werden per GitHub Actions veröffentlicht:

- `ghcr.io/timux/food-order/backend`
- `ghcr.io/timux/food-order/frontend`

Auslösung: manuell über GitHub Actions oder automatisch beim Erstellen eines Releases.

### Updates einspielen

```bash
git pull
docker compose up --build -d
```

Daten in PostgreSQL und hochgeladene Bilder bleiben in Docker-Volumes erhalten.

---

## Konfiguration

Alle Einstellungen befinden sich in der Datei `.env` im Projektverzeichnis. Nach Änderungen Container neu starten:

```bash
docker compose up -d
```

### Datenbank

```env
POSTGRES_USER=verein
POSTGRES_PASSWORD=verein_secret      # In Produktion ändern!
POSTGRES_DB=vereinsbestellung
```

### Sicherheit & Authentifizierung

```env
JWT_SECRET=change-me-in-production-use-long-random-string
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173    # Öffentliche URL des Frontends
```

| Variable | Beschreibung |
|----------|--------------|
| `JWT_SECRET` | Geheimer Schlüssel für Mitarbeiter-Login – **in Produktion unbedingt ändern** |
| `JWT_EXPIRES_IN` | Gültigkeitsdauer des Login-Tokens (z. B. `8h`, `24h`) |
| `CORS_ORIGIN` | Erlaubte Frontend-URL (bei HTTPS: `https://bestellung.ihr-verein.de`) |

### Frontend-URLs (Build-Zeit)

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
```

Bei Docker mit eigenem Domainnamen müssen diese URLs auf die öffentlich erreichbare Backend-Adresse zeigen. Nach Änderung Frontend neu bauen:

```bash
docker compose up --build -d frontend
```

### E-Mail (optional)

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=ihr-benutzer
SMTP_PASS=ihr-passwort
SMTP_FROM=noreply@ihr-verein.de
```

Ohne SMTP-Konfiguration funktionieren Bestellungen weiterhin – Kunden erhalten dann nur keine Bestätigungs-E-Mail.

### Bot-Schutz auf der Bestellseite (optional)

```env
VITE_TURNSTILE_SITE_KEY=ihr-site-key
TURNSTILE_SECRET_KEY=ihr-secret-key
```

Cloudflare Turnstile schützt die öffentliche Bestellseite vor automatisierten Bestellungen. Ohne diese Keys greifen weiterhin Honeypot und Zeitprüfung.

### Übersicht: Was muss vor dem Live-Betrieb geändert werden?

| Einstellung | Pflicht? |
|-------------|----------|
| `POSTGRES_PASSWORD` | ✅ Ja |
| `JWT_SECRET` | ✅ Ja |
| `CORS_ORIGIN` / `VITE_API_URL` / `VITE_WS_URL` | ✅ Ja (auf echte Domain) |
| Admin-Passwort (nach Seed) | ✅ Ja |
| SMTP | Optional |
| Turnstile | Optional |

---

## Erste Schritte nach der Installation

### 1. Anmeldung

1. Öffnen Sie `/mitarbeiter/login`
2. Melden Sie sich mit den Admin-Zugangsdaten an
3. Nach dem Login gelangen Sie zum Dashboard

**Standard-Zugangsdaten (nach Seed):**

| Rolle | E-Mail | Passwort |
|-------|--------|----------|
| Administrator | admin@verein.local | admin123 |
| Mitarbeiter (Küche) | kueche@verein.local | staff123 |

> **Wichtig:** Ändern Sie die Passwörter vor dem produktiven Einsatz!

![Dashboard](screenshots/06-dashboard.png)

### 2. Verein einrichten

Navigieren Sie zu **Verein** (`/mitarbeiter/verein`) und tragen Sie ein:

- Vereinsname und Logo
- Kontaktdaten für die öffentliche Kontaktseite

### 3. Erste Veranstaltung anlegen

Unter **Veranstaltungen** eine Veranstaltung mit korrektem **Veranstaltungsdatum** anlegen und **aktivieren**.

### 4. Speisen pflegen

Unter **Speisen** Gerichte für die aktive Veranstaltung anlegen.

### 5. Testbestellung durchführen

Öffnen Sie die öffentliche Bestellseite (`/`), geben Sie eine Testbestellung auf und prüfen Sie, ob sie in der Küchenansicht erscheint.

---

## Veranstaltungen verwalten

Navigieren Sie zu **Veranstaltungen** (`/mitarbeiter/veranstaltungen`).

![Veranstaltungen](screenshots/12-veranstaltungen.png)

### Neue Veranstaltung anlegen

1. Klicken Sie auf **Neue Veranstaltung**
2. Füllen Sie aus:
   - **Name** – z. B. „Sommerfest 2026"
   - **Beschreibung** – optionale Info für interne Zwecke
   - **Datum** – der Veranstaltungstag (entscheidend für Abholnummern!)
   - **Beginn / Ende** – Öffnungszeiten
3. Speichern

### Veranstaltung aktivieren

Es kann **immer genau eine** Veranstaltung aktiv sein. Klicken Sie bei der gewünschten Veranstaltung auf **Aktivieren**.

Die aktive Veranstaltung bestimmt:
- Welche Speisekarte öffentlich sichtbar ist
- Für welches Event Bestellungen angenommen werden
- Welche Bestellnummern vergeben werden

---

## Vorausbestellungen aktivieren

Kunden können **Tage oder Wochen vor** der Veranstaltung bestellen.

### So funktioniert es

1. Legen Sie die Veranstaltung mit dem **korrekten Veranstaltungsdatum** an
2. Aktivieren Sie die Veranstaltung
3. Schalten Sie **Onlinebestellungen aktiv** ein
4. Stellen Sie sicher, dass **Bestellungen geschlossen** aus ist

Die öffentliche Bestellseite zeigt dann z. B.:

> *Samstag, 15. August 2026 · Vorbestellung möglich*

![Bestellseite mit Vorbestellung](screenshots/01-bestellseite-monitor.png)

Die Bestellseite ist für Touch-Bedienung auf Smartphone und Tablet optimiert:

| Monitor | iPhone | iPad |
|:---:|:---:|:---:|
| ![Monitor](screenshots/01-bestellseite-monitor.png) | ![iPhone](screenshots/01-bestellseite-iphone.png) | ![iPad](screenshots/01-bestellseite-ipad.png) |

### Wichtige Regeln

| Aspekt | Verhalten |
|--------|-----------|
| Abholnummer | Gilt am **Veranstaltungstag** (001, 002, …) |
| Bestellzeitpunkt | Beliebig vor der Veranstaltung |
| Küche | Sieht am Event-Tag alle Vorbestellungen |
| Abholung | Funktioniert am Veranstaltungstag per Abholnummer |

---

## Speisen verwalten

Navigieren Sie zu **Speisen** (`/mitarbeiter/speisen`).

![Speisenverwaltung](screenshots/11-speisenverwaltung.png)

### Gericht anlegen

| Feld | Beschreibung |
|------|-------------|
| Name | Anzeigename auf der Bestellseite |
| Beschreibung | Kurzbeschreibung für Kunden |
| Preis | in Euro |
| Reihenfolge | Sortierung (1 = oben) |
| Aktiv | Sichtbar auf der Bestellseite |
| Ausverkauft | Temporär nicht bestellbar |
| Max. Bestellmenge | Optional, pro Bestellung |

### Bild hochladen

Klicken Sie beim Gericht auf das Kamera-Symbol und wählen Sie ein Bild (JPEG, PNG, WebP, max. 5 MB).

---

## Bestellungen überwachen

### Dashboard

![Dashboard](screenshots/06-dashboard.png)

Zeigt live:
- Anzahl Bestellungen (gesamt, offen, fertig, abgeholt)
- Umsatz
- Durchschnittliche Bearbeitungszeit
- Schnellzugriff auf Abholung und Bestellung

### Bestellübersicht

![Bestellungen](screenshots/10-bestellungen.png)

Alle Bestellungen chronologisch mit Statuswechsel per Klick:

```
Neu → In Bearbeitung → Fertig → Abgeholt
                         ↓
                    Storniert
```

---

## Vereinseinstellungen

Navigieren Sie zu **Verein** (`/mitarbeiter/verein`).

![Vereinseinstellungen](screenshots/13-vereinseinstellungen.png)

Konfigurierbar:

| Feld | Anzeige |
|------|---------|
| Vereinsname | Header auf allen öffentlichen Seiten |
| Logo | Header (Avatar), Kontaktseite |
| Beschreibung | Kontaktseite |
| Ansprechpartner, E-Mail, Telefon, Adresse, Website | Kontaktseite (`/kontakt`) |

Ohne eigene Angaben werden Standardwerte verwendet. Kunden erreichen die Kontaktseite über den **Kontakt**-Button auf der Bestellseite.

---

## Mitarbeiter & Rollen

| Rolle | Berechtigungen |
|-------|---------------|
| **ADMIN** | Vollzugriff: Verein, Veranstaltungen, Speisen, alle Mitarbeiterfunktionen |
| **STAFF** | Küche, Abholung, Bestellung, Bestellungen, Dashboard |

Neue Benutzer werden aktuell über das Seed-Skript oder direkt in der Datenbank angelegt. Eine Benutzerverwaltungs-Oberfläche ist als zukünftige Erweiterung vorgesehen.

---

## Schalter & Einstellungen

Pro Veranstaltung drei Schalter:

| Schalter | Wirkung |
|----------|---------|
| **Onlinebestellungen aktiv** | Öffentliche Bestellseite erreichbar |
| **Bestellung vor Ort aktiv** | Mitarbeiter können Bestellungen vor Ort aufgeben |
| **Bestellungen geschlossen** | Keine neuen Bestellungen |

### Typische Szenarien

| Situation | Online | Vor Ort | Geschlossen |
|---------|--------|---------|-------------|
| Vorbestellphase (2 Wochen vorher) | ✅ | ❌ | ❌ |
| Veranstaltungstag | ✅ | ✅ | ❌ |
| Ausverkauf / Ende | ❌ | ❌ | ✅ |

---

## Abholboard einrichten

Das Abholboard (`/abholboard`) ist für Fernseher oder Monitore gedacht.

![Abholboard](screenshots/04-abholboard-monitor.png)

### Einrichtung

1. Öffnen Sie `/abholboard` auf dem Monitor-PC
2. Vollbildmodus aktivieren (F11)
3. Die Anzeige aktualisiert sich automatisch per WebSocket

### Anzeige

- Nur Bestellungen mit Status **Fertig**
- Nur die Abholnummer (groß und gut lesbar)
- Verschwindet automatisch nach Abholung
- Akustisches Signal bei neuen fertigen Bestellungen

---

## E-Mail-Benachrichtigungen

Wenn Kunden optional eine E-Mail angeben, erhalten sie eine Bestellbestätigung mit:
- Abholnummer
- Veranstaltungstag
- Bestellte Gerichte und Gesamtpreis

Konfiguration in `.env` – siehe Abschnitt [Konfiguration](#konfiguration).

---

## Checkliste am Veranstaltungstag

- [ ] Richtige Veranstaltung ist **aktiviert**
- [ ] Online- und Kassenbestellungen nach Bedarf **aktiviert**
- [ ] Küchen-Tablet zeigt `/mitarbeiter/kueche`
- [ ] Abholung zeigt `/mitarbeiter/abholung`
- [ ] Bestellung vor Ort unter `/mitarbeiter/bestellung`
- [ ] Abholboard auf Monitor: `/abholboard`
- [ ] Alle Vorbestellungen sind in der Küchenansicht sichtbar
- [ ] Testbestellung durchgeführt

---

## FAQ

### Kann ich mehrere Veranstaltungen gleichzeitig aktiv haben?

Nein. Es ist immer genau **eine** Veranstaltung aktiv. Diese steuert Speisekarte, Bestellannahme und Abholnummern.

### Wann beginnen die Abholnummern bei 001?

Die Nummerierung (001, 002, …) bezieht sich auf den **Veranstaltungstag**, nicht auf den Bestellzeitpunkt. Vorbestellungen erhalten bereits vorher ihre Nummer für diesen Tag.

### Können Kunden ohne E-Mail bestellen?

Ja. E-Mail und Telefon sind optional. Pflicht sind nur Vor- und Nachname sowie mindestens ein Gericht.

### Wie schütze ich die Bestellseite vor Bots?

Standardmäßig sind Honeypot und Zeitprüfung aktiv. Für zusätzlichen Schutz kann Cloudflare Turnstile in der `.env` konfiguriert werden (siehe [Konfiguration](#konfiguration)).

### Werden Bestellungen in Echtzeit aktualisiert?

Ja. Küche, Dashboard, Kundenstatus und Abholboard nutzen WebSocket-Verbindungen. Bei Verbindungsproblemen hilft ein Seiten-Reload.

### Kann ich die App auf Tablets installieren?

Ja. Die Anwendung ist als PWA nutzbar: Im Browser **Zum Startbildschirm hinzufügen** wählen (besonders praktisch für Küche, Abholung und Bestellung).

### Wie lege ich neue Mitarbeiter an?

Aktuell über das Seed-Skript (`npm run seed`) oder direkt in der Datenbank. Eine Benutzeroberfläche zur Verwaltung ist geplant.

### Was passiert mit hochgeladenen Speisebildern bei einem Update?

Bilder liegen im Docker-Volume `uploads_data` und bleiben bei Updates erhalten, solange das Volume nicht gelöscht wird.

### Funktioniert die Plattform ohne Internet?

Für den lokalen Betrieb im Vereinsnetz reicht das interne Netzwerk. Für E-Mail-Benachrichtigungen und optionalen Turnstile-Schutz wird Internet benötigt.

---

## Troubleshooting

### Die Bestellseite zeigt „Derzeit sind keine Bestellungen möglich"

**Mögliche Ursachen:**

| Ursache | Lösung |
|---------|--------|
| Keine Veranstaltung aktiv | Veranstaltung anlegen und **aktivieren** |
| Onlinebestellungen aus | Schalter **Onlinebestellungen aktiv** einschalten |
| Bestellungen geschlossen | Schalter **Bestellungen geschlossen** ausschalten |
| Keine aktiven Speisen | Unter **Speisen** Gerichte anlegen und auf **Aktiv** setzen |

### Login funktioniert nicht

1. Prüfen Sie E-Mail und Passwort (Groß-/Kleinschreibung beachten)
2. Container-Status prüfen: `docker compose ps`
3. Backend-Logs prüfen: `docker compose logs backend --tail 50`
4. Nach frischer Installation: `docker compose exec backend npm run seed` ausführen

### Küche / Dashboard zeigt keine Live-Updates

1. Seite neu laden
2. Prüfen, ob `VITE_WS_URL` in `.env` auf die erreichbare Backend-URL zeigt
3. Bei HTTPS: sicherstellen, dass WebSocket-Verbindungen (`wss://`) durch den Reverse Proxy erlaubt sind
4. Firewall: Port 3001 bzw. WebSocket-Weiterleitung prüfen

### Abholboard zeigt keine fertigen Bestellungen

1. Bestellung muss den Status **Fertig** haben (in Küche oder Bestellübersicht setzen)
2. Abholboard-Seite neu laden
3. Gleiche aktive Veranstaltung wie in der Küche verwenden

### E-Mails kommen nicht an

1. SMTP-Einstellungen in `.env` prüfen
2. Backend nach Änderung neu starten: `docker compose up -d backend`
3. Logs prüfen: `docker compose logs backend | grep -i mail`
4. Spam-Ordner des Empfängers prüfen

### Bilder von Speisen werden nicht angezeigt

1. Dateiformat: JPEG, PNG oder WebP, max. 5 MB
2. Upload-Volume prüfen: `docker volume ls | grep uploads`
3. Backend-Logs auf Fehler beim Upload prüfen

### Container starten nicht / Datenbankfehler

```bash
docker compose down
docker compose up -d postgres
# Warten bis postgres healthy ist
docker compose up -d
```

Bei anhaltenden Problemen Logs aller Dienste prüfen:

```bash
docker compose logs --tail 100
```

### Daten zurücksetzen (Vorsicht – löscht alle Bestellungen!)

```bash
docker compose down -v
docker compose up --build -d
docker compose exec backend npm run seed
```

> **Achtung:** `-v` löscht alle Docker-Volumes inklusive Datenbank und Uploads.

### Nützliche Befehle

| Befehl | Zweck |
|--------|-------|
| `docker compose ps` | Status aller Dienste |
| `docker compose logs -f backend` | Backend-Logs live |
| `docker compose restart backend` | Backend neu starten |
| `docker compose exec backend npm run seed` | Beispieldaten laden |
| `curl http://localhost:3001/api/health` | API erreichbar? |

---

## Support & Dokumentation

- [Benutzerhandbuch (Mitarbeiter)](USER_GUIDE.md)
- [Entwicklerhandbuch](DEVELOPER_GUIDE.md)
- [README](../README.md)
