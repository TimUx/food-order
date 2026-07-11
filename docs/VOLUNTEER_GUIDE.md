# So betreiben Sie die Plattform

Diese Seite richtet sich an **Vorstände und Helfer:innen ohne IT-Hintergrund**. Sie brauchen kein Programmierwissen — nur Docker auf einem Rechner und diese Schritte.

Technische Details: [Dokumentation](README.md) · [Betriebshandbuch](OPERATIONS.md) · [Admin Guide](ADMIN_GUIDE.md)

---

## Was die Plattform macht

An einem Veranstaltung können Gäste **online vorbestellen**, die **Küche** sieht Bestellungen live, an der **Abholung** wird mit einer Nummer ausgegeben, und der **Vorstand** pflegt Speisekarte und Veranstaltung im Admin-Bereich.

Alles läuft auf **Ihrem** Server — keine Cloud-Pflicht, keine Kunden-Registrierung.

---

## Einmal einrichten (ca. 30 Minuten)

**Empfohlen:** [Installations-Assistent](INSTALLATION.md) (`./install.sh`) — führt durch Docker, `.env` und Start.

Kurz manuell:

1. **Docker installieren** auf einem PC oder kleinen Server (Linux empfohlen).
2. Projektordner kopieren oder von GitHub klonen.
3. Datei `.env` aus `.env.example` anlegen und **Passwörter ändern** (siehe [OPERATIONS.md — Secrets](OPERATIONS.md#secrets-env)).
4. Starten:
   ```bash
   docker compose pull
   docker compose up -d
   docker compose exec backend npm run seed
   ```
5. Im Browser öffnen: `http://localhost:5173/admin/login`
6. **Eigenes Admin-Passwort** setzen (Benutzerverwaltung) — Demo-Zugänge nur für Tests, siehe [Developer Guide](DEVELOPER_GUIDE.md#test-zugangsdaten).
7. Verein, Veranstaltung und Speisekarte eintragen.
8. **Testbestellung** vom Handy aus probieren.

---

## Vor dem Fest (Checkliste)

Kurzfassung — ausführlich in [OPERATIONS.md](OPERATIONS.md#vor-dem-sommerfest-checkliste):

- [ ] Server läuft, Internet/WLAN ok
- [ ] Backup erstellt (`./scripts/backup/postgres-backup.sh`)
- [ ] Richtige Veranstaltung ist **aktiv**
- [ ] Speisekarte stimmt
- [ ] Küchen-Tablet und Abhol-Monitor getestet
- [ ] Kein Software-Update am Festtag selbst

---

## Am Festtag

| Wer | Wo im Browser | Aufgabe |
|-----|----------------|---------|
| Gäste | Startseite `/` | Bestellen |
| Küche | `/mitarbeiter/kueche` | Gerichte abarbeiten |
| Abholung | `/mitarbeiter/abholung` | Nummer eingeben, aushändigen |
| Kasse (optional) | `/mitarbeiter/bestellung` | Bestellung vor Ort |
| Monitor | `/abholboard` | Fertige Nummern groß anzeigen |

**Tipp:** Lesezeichen auf den Tablets anlegen — dann finden Helfer die Seiten sofort.

---

## Nach dem Fest

1. Letzte Bestellungen abschließen.
2. **Backup** erstellen.
3. Online-Bestellung für das Event abschalten.

---

## Update (neue Version)

Immer **zuerst Backup**, dann:

```bash
./scripts/backup/postgres-backup.sh
docker compose pull
docker compose up -d
```

Mehr dazu: [OPERATIONS.md — Update](OPERATIONS.md#update-durchführen).

---

## Team & Rechte

Im Admin-Bereich unter **Team** legen Sie Helfer mit **Rollenvorlagen** an — z. B. Küche, Abholung oder Kasse. Jede Person erhält nur die Rechte für ihre Aufgabe. Eine Kassenkraft kann weder andere Teammitglieder verwalten noch Zahlungseinstellungen ändern.

Details: [Admin Guide — Mitarbeiter & Rollen](ADMIN_GUIDE.md#mitarbeiter--rollen)

---

## Wenn etwas schiefgeht

| Problem | Erste Hilfe |
|---------|-------------|
| Seite lädt nicht | `docker compose ps` — laufen alle drei Container? |
| Login geht nicht | Passwort zurücksetzen (Admin) oder `.env` / `JWT_SECRET` prüfen |
| Keine Live-Updates in Küche | Seite neu laden, WLAN prüfen |
| Nach Update kaputt | Backup zurückspielen — [Wiederherstellung](OPERATIONS.md#wiederherstellung-aus-backup) |

Logs ansehen: `docker compose logs backend` (letzte Zeilen kopieren für Support).

---

## Hilfe & Mitmachen

- **Fehler melden:** GitHub → Issues → „Fehler melden“
- **Idee einreichen:** GitHub → Issues → „Funktionswunsch“
- **Geplante Funktionen:** siehe [CHANGELOG.md](../CHANGELOG.md)

Die Software ist **Version 1.0** — für Veranstaltunge gedacht, mit dokumentiertem Betrieb und Backup.
