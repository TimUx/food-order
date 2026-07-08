# Administratorhandbuch (Admin Guide)

Anleitung für Administratoren der Vereinsbestellplattform mit Vollzugriff auf alle Funktionen.

## Inhaltsverzeichnis

1. [Erste Schritte](#erste-schritte)
2. [Veranstaltungen verwalten](#veranstaltungen-verwalten)
3. [Vorausbestellungen aktivieren](#vorausbestellungen-aktivieren)
4. [Speisen verwalten](#speisen-verwalten)
5. [Bestellungen überwachen](#bestellungen-überwachen)
6. [Mitarbeiter & Rollen](#mitarbeiter--rollen)
7. [Schalter & Einstellungen](#schalter--einstellungen)
8. [Abholboard einrichten](#abholboard-einrichten)
9. [E-Mail-Benachrichtigungen](#e-mail-benachrichtigungen)
10. [Checkliste am Veranstaltungstag](#checkliste-am-veranstaltungstag)

---

## Erste Schritte

### Anmeldung

1. Öffnen Sie `/mitarbeiter/login`
2. Melden Sie sich mit Ihren Admin-Zugangsdaten an
3. Nach dem Login gelangen Sie zum Dashboard

**Standard-Zugangsdaten (nach Seed):**

| Rolle | E-Mail | Passwort |
|-------|--------|----------|
| Administrator | admin@verein.local | admin123 |

> **Wichtig:** Ändern Sie die Passwörter vor dem produktiven Einsatz!

![Dashboard](screenshots/06-dashboard.png)

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

Die öffentliche Bestellseite zeigt dann:

> *Veranstaltung: Samstag, 15. August 2026*
> *Sie können bereits jetzt vorbestellen – auch Tage oder Wochen vor der Veranstaltung.*

![Bestellseite mit Vorbestellung](screenshots/01-bestellseite-monitor.png)

Die Bestellseite ist für Touch-Bedienung auf Smartphone und Tablet optimiert (große Buttons, gut lesbare Texte):

| Monitor | iPhone | iPad |
|:---:|:---:|:---:|
| ![Monitor](screenshots/01-bestellseite-monitor.png) | ![iPhone](screenshots/01-bestellseite-iphone.png) | ![iPad](screenshots/01-bestellseite-ipad.png) |

### Wichtige Regeln

| Aspekt | Verhalten |
|--------|-----------|
| Abholnummer | Gilt am **Veranstaltungstag** (001, 002, …) |
| Bestellzeitpunkt | Beliebig vor der Veranstaltung |
| Küche | Sieht am Event-Tag alle Vorbestellungen |
| Kassenabfrage | Funktioniert am Veranstaltungstag per Abholnummer |

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

Konfiguration in `.env`:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=ihr-benutzer
SMTP_PASS=ihr-passwort
SMTP_FROM=noreply@ihr-verein.de
```

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

## Support & Dokumentation

- [Benutzerhandbuch (Mitarbeiter)](USER_GUIDE.md)
- [Entwicklerhandbuch](DEVELOPER_GUIDE.md)
- [README](../README.md)
