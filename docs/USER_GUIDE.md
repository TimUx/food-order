# Benutzerhandbuch (Mitarbeiter)

Anleitung für Mitarbeiter in Küche, Abholung und Service – ohne Administratorrechte.

## Inhaltsverzeichnis

1. [Anmeldung](#anmeldung)
2. [Übersicht der Bereiche](#übersicht-der-bereiche)
3. [Küchenansicht](#küchenansicht)
4. [Abholung](#abholung)
5. [Bestellung vor Ort](#bestellung-vor-ort)
6. [Bestellungen verwalten](#bestellungen-verwalten)
7. [Vorausbestellungen am Event-Tag](#vorausbestellungen-am-event-tag)
8. [Tipps & häufige Fragen](#tipps--häufige-fragen)

---

## Anmeldung

1. Öffnen Sie die Adresse Ihres Vereins, z. B. `https://bestellung.ihr-verein.de/service/login`
2. Geben Sie E-Mail und Passwort ein
3. Tippen Sie auf **Anmelden**

![Mitarbeiter-Login](screenshots/05-mitarbeiter-login.png)

**Test-Zugangsdaten (Demo):**

| Vorlage | E-Mail | Passwort | Login |
|---------|--------|----------|-------|
| Küche | kueche@verein.local | staff123 | `/service/login` |
| Kasse | kasse@verein.local | staff123 | `/service/login` |

Ihr Vorstand weist Ihnen eine **Rollenvorlage** zu (Küche, Abholung, Kasse …). Sie sehen nur die Bereiche, die zu Ihrer Aufgabe passen.

> **Hinweis für Administratoren:** Veranstalterdaten, Benutzer und Veranstaltungen verwalten Sie im separaten [Administrationsbereich](/admin/login) – siehe [Admin Guide](ADMIN_GUIDE.md).

> Die App kann als PWA auf dem Tablet installiert werden (Zum Startbildschirm hinzufügen).

### Menü ein- und ausblenden

In Küche, Abholung und Bestellung ist das Seitenmenü standardmäßig **ausgeblendet** – für maximale Arbeitsfläche. Über das Menü-Symbol oben links können Sie es jederzeit ein- oder ausblenden.

---

## Übersicht der Bereiche

Nach der Anmeldung sehen Sie das **Dashboard** mit aktuellen Zahlen:

![Dashboard](screenshots/06-dashboard.png)

| Menüpunkt | Für wen | Aufgabe |
|-----------|---------|---------|
| Dashboard | Alle | Übersicht, Statistiken, Schnellzugriff Abholung/Bestellung |
| Bestellungen | Alle | Alle Bestellungen einsehen |
| Küche | Küchenteam | Bestellungen bearbeiten |
| Abholung | Ausgabe | Abholung per Nummer bestätigen |
| Bestellung | Vor Ort | Neue Bestellung aufgeben |
| Administration | Nur Admin | Link zum Admin-Bereich (Verein, Benutzer, Events) |

---

## Küchenansicht

**Adresse:** `/service/kueche`

Optimiert für Tablets mit großen Buttons.

![Küchenansicht](screenshots/07-kuechenansicht-tablet.png)

### Ablauf

1. Neue Bestellungen erscheinen automatisch, sobald sie **für die Küche freigegeben** sind (Vor-Ort sofort; Online nach Zahlung oder manueller Freigabe in der Bestellliste)
2. Tippen Sie **Bearbeitung starten** → Status wird *In Bearbeitung*
3. Wenn das Essen fertig ist: **Fertig** tippen → Status wird *Fertig*
4. Die Abholnummer erscheint auf dem öffentlichen Abholboard

### Filter

Standardmäßig werden nur **Neu** und **In Bearbeitung** angezeigt.

Optional einschaltbar:
- ☑ Fertig anzeigen
- ☑ Abgeholt anzeigen

---

## Abholung

**Adresse:** `/service/abholung`

Hier bestätigen Sie, dass ein Kunde seine Bestellung abgeholt hat.

![Abholung](screenshots/08-abholung.png)

### Ablauf

1. **Veranstaltung wählen** (Dropdown — vorausgewählt: heutiges Veranstaltungsdatum, falls eindeutig)
2. Kunde nennt seine **Abholnummer** (z. B. „043")
3. Nummer eingeben und suchen
4. Bestellung wird angezeigt: Gerichte, Gesamtpreis, Status
5. Wenn Status **Fertig**: **Abholung bestätigen** tippen
6. Status wechselt zu *Abgeholt*, Nummer verschwindet vom Abholboard

> **Wichtig:** Abholnummern gelten **pro Veranstaltungstag**. Bei mehreren parallelen Veranstaltungen immer die richtige Veranstaltung im Dropdown wählen.

### Hinweise

| Status | Was tun? |
|--------|----------|
| Fertig | Abholung bestätigen |
| In Bearbeitung | Kunde bitten zu warten |
| Abgeholt | Bereits ausgegeben |
| Neu | Noch nicht in der Küche |

---

## Bestellung vor Ort

**Adresse:** `/service/bestellung`

Für Bestellungen **vor Ort** ohne Kundendaten (kein Name nötig).

![Bestellung](screenshots/09-bestellung.png)

### Ablauf

1. **Veranstaltung wählen** (Dropdown — Standard: heutiges Datum)
2. Gerichte per Plus/Minus auswählen
3. **Bestellung speichern** tippen
4. Die **Abholnummer** wird groß angezeigt
5. Nummer dem Kunden mitteilen oder anzeigen
6. **Nächste Bestellung** für den folgenden Kunden

Ohne gewählte Veranstaltung ist keine Bestellung möglich.

---

## Bestellungen verwalten

**Adresse:** `/service/bestellungen`

![Bestellungen](screenshots/10-bestellungen.png)

Zeigt alle Bestellungen mit Abholnummer, Uhrzeit, Gerichten, Quelle (Online / Vor Ort) und Status.

**Kontakt zum Kunden:** Bei Online-Bestellungen werden unter dem Namen **E-Mail** und **Telefonnummer** angezeigt (falls angegeben). Die Links sind direkt anklickbar (`mailto:` / `tel:`) – praktisch, wenn der Kunde seine Abholnummer vergessen hat oder Rückfragen nötig sind.

### Status per Klick ändern

| Button | Neuer Status |
|--------|-------------|
| In Bearbeitung | Küche hat begonnen |
| Fertig | Bereit zur Abholung |
| Stornieren | Bestellung storniert |

---

## Vorausbestellungen am Event-Tag

Kunden können **Wochen vorher** online bestellen. Am Veranstaltungstag:

1. Alle Vorbestellungen erscheinen in der Küchenansicht
2. Die Abholnummer wurde bereits bei der Bestellung vergeben
3. Kunden können ihren Status unter `/status` verfolgen
4. Bei Abfrage mit **Abholnummer + Nachname** finden Kunden ihre Bestellung wieder (bei mehreren aktiven Veranstaltungen zuerst die Veranstaltung wählen)
5. Innerhalb der Stornierungsfrist können Kunden auf der Statusseite selbst stornieren (Nachname zur Bestätigung)

### Onlinezahlung (optional)

Wenn Ihr Verein das **Payment-Modul** aktiviert hat:

1. Kunde wählt **Online bezahlen** oder **Vor Ort bezahlen** (Smart Payment – nur sichtbar wenn nötig)
2. Bei Onlinezahlung: QR-Code oder Link zur Zahlungsseite, Live-Status in der Bestellübersicht
3. Die Bestellung erscheint in der Küche **erst nach erfolgreicher Zahlung**
4. Unbezahlte oder abgebrochene Bestellungen sind in der Küche **nicht sichtbar**
5. Barzahlung an der Kasse funktioniert weiterhin unverändert

> **Hinweis:** Ohne aktiviertes Payment-Modul gehen Bestellungen wie bisher sofort an die Küche.

![Kundenstatus](screenshots/02-kundenstatus.png)

Die Statusseite zeigt bei stornierbaren Bestellungen einen **Stornieren**-Button und die Stornierungsfrist an.

---

## Tipps & häufige Fragen

### Kunde möchte Bestellung stornieren?

- Kunden können auf der Statusseite (`/status` oder Link aus der Bestätigungs-E-Mail) innerhalb der Stornierungsfrist selbst stornieren
- Dazu Nachname zur Bestätigung eingeben
- Nach Ablauf der Frist oder bei Status **Fertig** / **Abgeholt**: Stornierung nur noch durch Mitarbeiter in der Bestellübersicht

### Kunde hat Abholnummer vergessen?

- Kunde kann unter `/status` mit **Abholnummer + Nachname** nachschauen (bei mehreren Veranstaltungen: Veranstaltung im Dropdown wählen)
- Oder in der Bestellübersicht nach dem Namen suchen

### Kontaktdaten für Kunden

Kunden finden Vereinskontaktdaten über den **Kontakt**-Button auf der Bestellseite oder unter `/kontakt`.

![Kontakt](screenshots/14-kontakt.png)

Wenn das Modul **Rechtliche Informationen** aktiviert ist, erscheinen zusätzlich Links wie **Impressum**, **Datenschutz**, **AGB** oder **Widerruf** im Footer der Bestellseite. Dort finden Kunden die vom Verein veröffentlichten Rechtstexte.

### Abholboard für Gäste

Separater Monitor unter `/abholboard` – kein Login nötig. Bei mehreren aktiven Veranstaltungen zuerst die richtige Veranstaltung wählen.

![Abholboard](screenshots/04-abholboard-monitor.png)

---

## Kurzreferenz Statusablauf

```
Neu  →  In Bearbeitung  →  Fertig  →  Abgeholt
                              ↓
                         Storniert
```

Weitere Informationen für Administratoren: [Admin Guide](ADMIN_GUIDE.md)
