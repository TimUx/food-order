# Betriebshandbuch — FestSchmiede

Kurze Anleitung für ehrenamtliche Betreuer:innen. Kein Entwickler-Jargon — nur das, was vor, während und nach einer Veranstaltung wichtig ist.

> **Version 2.0:** Multi-Tenant-Betrieb erfordert Wildcard-DNS (`*.ihre-domain.de`) und TLS für Subdomains. Traefik wird als Reverse Proxy empfohlen. Bestehende Single-Tenant-Installationen werden beim **ersten App-Start nach dem Update** automatisch dem Standard-Veranstalter (`slug: default`) zugeordnet. Details: [ADR-027](architecture/027-multi-tenant-deployment.md).

Ausführlichere Admin-Themen: [Admin Guide](ADMIN_GUIDE.md) · Einführung ohne Fachbegriffe: [Volunteer Guide](VOLUNTEER_GUIDE.md)

---

## Vor dem Sommerfest (Checkliste)

1. **Server prüfen** — Rechner oder VPS läuft, genug Speicherplatz (mind. 10 GB frei empfohlen).
2. **Docker starten** — `docker compose ps`: alle drei Dienste (`postgres`, `backend`, `frontend`) **running**.
3. **Health prüfen** — siehe Abschnitt [Health prüfen](#health-prüfen).
4. **`.env` sichern** — Datei mit Passwörtern und Secrets kopieren (USB-Stick oder Passwort-Manager), nicht ins öffentliche Git legen.
5. **Backup erstellen** — siehe [Backup](#backup-vor-updates-und-regelmäßig).
6. **Aktive Veranstaltung** — Im Admin unter Veranstaltungen: richtiges Event aktiv, Datum und Uhrzeiten stimmen.
7. **Speisekarte** — Gerichte angelegt, Preise korrekt, ausverkaufte Artikel markiert.
8. **Online-Bestellung** — Schalter „Online-Bestellungen“ am Event eingeschaltet (falls gewünscht).
9. **Mitarbeiter** — Konten für Küche, Kasse und Abholung angelegt, **keine Demo-Passwörter** in Produktion.
10. **Testbestellung** — Einmal von Handy/Tablet bestellen und in der Küche sichtbar?
11. **Abholboard** — Monitor unter `/abholboard` im Vollbild, WLAN stabil.
12. **HTTPS** — Öffentliche URL nur über verschlüsselte Verbindung (Reverse Proxy), siehe [Admin Guide — Reverse Proxy](ADMIN_GUIDE.md#reverse-proxy-https).

---

## Am Veranstaltungstag

1. Morgens: `docker compose ps` und Health-Check.
2. Küche: Tablet auf `/mitarbeiter/kueche` — Lautstärke/Bildschirm an.
3. Abholung: `/mitarbeiter/abholung` bereit halten.
4. Bei Bedarf: Kasse `/mitarbeiter/bestellung` für Bestellungen vor Ort.
5. **WLAN-Probleme?** Seite neu laden; Bestellungen bleiben in der Datenbank.
6. **Kein Panik bei Updates** — Am Veranstaltungstag **kein** `docker compose pull` / Update durchführen.

---

## Nach dem Event

1. Offene Bestellungen in der Übersicht prüfen (Abholung abschließen).
2. Event ggf. deaktivieren oder Online-Bestellungen schließen.
3. **Backup erstellen** — Datenbank sichern (siehe unten).
4. Optional: Auswertung im Dashboard exportieren/notieren.
5. Logs bei Problemen sichern: `docker compose logs > event-$(date +%F).log`

---

## Update durchführen

**Empfohlen (ohne manuelle Docker-Befehle):**

```bash
cd ~/festschmiede   # oder Ihr Installationsverzeichnis
./install.sh --update
```

Der Assistent führt automatisch aus:

1. **Konfigurations-Backup** (`.installer-state/backups/`)
2. **Datenbank-Backup** (`scripts/backup/postgres-backup.sh`)
3. **Neue Images** (`docker compose pull`)
4. **Container neu starten** (Schema-Sync beim Backend-Start)
5. **Health-Check** (API muss `status: ok` melden)
6. Bei Fehler: **Rollback** (Config + optional Datenbank)

Vor dem Update nur prüfen (keine Änderungen):

```bash
./install.sh --validate
```

Weitere Betriebsbefehle:

| Befehl | Zweck |
|--------|--------|
| `./install.sh --backup` | Nur Datenbank-Backup |
| `./install.sh --repair` | Container neu starten + Health |
| `./install.sh --validate` | Voraussetzungen prüfen |

Details: [ADR-044 — Guided Operations](architecture/044-guided-operations.md)

### Manuell (Experten)

```bash
# 1. Backup (Pflicht!)
./scripts/backup/postgres-backup.sh

# 2. Neue Images holen
docker compose pull

# 3. Container neu starten (Migrationen laufen beim Backend-Start automatisch)
docker compose up -d

# 4. Prüfen
docker compose ps
curl -s http://localhost:3001/api/health
```

Das Backend wendet beim Start **versionierte Prisma-Migrationen** an (`prisma migrate deploy`). Vor Schema-Änderungen erstellt der Container automatisch ein Pre-Migration-Backup (sofern bereits Daten vorhanden). Der Installer erstellt bei Upgrades zusätzlich ein Backup über `scripts/backup/postgres-backup.sh`.

**Wichtig:** `prisma db push` wird in Produktion **nicht** verwendet.

Bei Fehlern nach dem Update: Abschnitt [Wiederherstellung aus Backup](#wiederherstellung-aus-backup).

### Schema-Migrationen (Prisma)

| Schritt | Beschreibung |
|---------|--------------|
| Backup | `./scripts/backup/postgres-backup.sh` (Pflicht vor Updates) |
| Update | `docker compose pull && docker compose up -d` |
| Migration | Backend führt `prisma migrate deploy` aus — startet bei Fehler **nicht** |
| Rollback | Backup mit `postgres-restore.sh` wiederherstellen |

Pre-Migration-Backups im Container: `/app/backups/pre-migrate-*.sql.gz` (wenn Daten vorhanden).

---

## Backup (vor Updates und regelmäßig)

```bash
./scripts/backup/postgres-backup.sh
```

Backups landen standardmäßig in `./backups/` als `vereinsbestellung-YYYYMMDD-HHMMSS.sql.gz`.

**Empfehlung:** Vor jedem Update und nach jedem großen Event ein Backup; Kopie auf zweitem Medium.

---

## Wiederherstellung aus Backup

> **Achtung:** Überschreibt die aktuelle Datenbank. Nur bei echtem Datenverlust oder fehlgeschlagenem Update.

```bash
# Interaktiv (Bestätigung wird abgefragt):
./scripts/backup/postgres-restore.sh backups/vereinsbestellung-20260709-120000.sql.gz

# Für Automatisierung / Skripte:
CONFIRM=1 ./scripts/backup/postgres-restore.sh backups/vereinsbestellung-20260709-120000.sql.gz
```

Danach Backend neu starten:

```bash
docker compose restart backend
curl -s http://localhost:3001/api/health
```

**Restore einmal pro Jahr testen** — z. B. auf einem zweiten Rechner mit Kopie der `.env` und eines Backups.

Backup-Integrität ohne Datenbank zu überschreiben (Dry-Run):

```bash
DRY_RUN=1 ./scripts/backup/postgres-restore.sh backups/vereinsbestellung-20260709-120000.sql.gz
```

Erwartete Ausgabe: `DRY_RUN OK: … (gzip gültig)`.

---

## Secrets (`.env`)

| Variable | Wofür | Hinweis |
|----------|--------|---------|
| `POSTGRES_PASSWORD` | Datenbank | Starkes Passwort, nicht `verein_secret` |
| `JWT_SECRET` | Mitarbeiter-Login | Mind. 32 Zeichen, zufällig |
| `APP_ENCRYPTION_KEY` | Zahlung/E-Mail in DB | Mind. 32 Zeichen, wenn Module genutzt |
| `CORS_ORIGIN` | Öffentliche Frontend-URL | In Produktion: `platform.network.corsOrigins` mit `https://…` (kein `*`) |
| `TURNSTILE_*` | Bot-Schutz Bestellseite | Optional |
| `UPLOAD_AV_HOOK` | Optionaler Virenscan für Uploads | Pfad zu Skript; Exit 0 = OK |

Vorlage: `.env.example` · `.env` **niemals** committen oder öffentlich teilen.

Der Server startet in Produktion **nicht**, wenn Secrets zu schwach sind oder CORS nur localhost/`*` erlaubt — Fehlermeldung im Backend-Log prüfen.

---

## Secret-Rotation

Vor jeder Rotation: **Datenbank-Backup** (`./scripts/backup/postgres-backup.sh`).

| Secret | Vorgehen |
|--------|----------|
| `JWT_SECRET` | Neues Secret in `.env`, `docker compose up -d backend` — alle Mitarbeiter müssen sich neu anmelden |
| `APP_ENCRYPTION_KEY` | Nur mit Wartungsfenster; verschlüsselte Modul-Settings ggf. neu eingeben oder Migration ausführen |
| `PLATFORM_ADMIN_PASSWORD` | In `.env` ändern, Backend neu starten |
| `POSTGRES_PASSWORD` | In Postgres und `.env`/`DATABASE_URL` ändern, Stack neu starten |

CORS-Origins nach Domain-Wechsel in der Plattformverwaltung unter Netzwerk-Einstellungen (`platform.network.corsOrigins`) anpassen — mindestens eine `https://`-URL.

---

## Health prüfen

```bash
curl -s http://localhost:3001/api/health
```

Erwartete Antwort (JSON): `"status":"ok"` und ein Zeitstempel.

Alle Container:

```bash
docker compose ps
```

Postgres-Gesundheit ist in Compose eingebaut (`healthy`).

---

## Logs lesen

```bash
# Alle Dienste, letzte 100 Zeilen
docker compose logs --tail=100

# Nur Backend (API-Fehler)
docker compose logs -f backend

# Nur heute relevante Fehler suchen
docker compose logs backend 2>&1 | tail -200
```

Bei anhaltenden Fehlern nach Update: Backup wiederherstellen und Issue mit Log-Ausschnitt melden.

---

## Ressourcen-Empfehlungen (Single-Node)

Für typische Veranstaltunge (ein Server, ein Verein):

| Ressource | Minimum | Empfohlen |
|-----------|---------|-----------|
| CPU | 2 Kerne | 4 Kerne |
| RAM | 4 GB | 8 GB |
| Speicher | 20 GB SSD | 40 GB SSD |
| Netzwerk | Stabiles WLAN/LAN | Kabel für Server |

Ein Rechner reicht für Bestellungen, Küche, Abholboard und Admin gleichzeitig — solange Postgres **nicht** ins Internet exponiert ist (Standard in `docker-compose.yml`).

---

## Skalierung

**Typischer Verein:** Eine Instanz (ein `docker compose` Stack) — **kein Redis nötig**.

**Redis / mehrere Backend-Instanzen** nur relevant, wenn:

- mehrere Server parallel dieselbe Installation bedienen, oder
- sehr hohe gleichzeitige WebSocket-Verbindungen erwartet werden.

Für Vereins-Events ist **Single-Instance** der vorgesehene und dokumentierte Betriebsmodus. Horizontal skalieren erst planen, wenn Messungen (z. B. `scripts/qa/load-test.k6.js`) Engpässe zeigen.

---

## Weitere Hilfe

| Thema | Dokument |
|-------|----------|
| Installation & Admin-Oberfläche | [ADMIN_GUIDE.md](ADMIN_GUIDE.md) |
| Ehrenamt ohne Fachbegriffe | [VOLUNTEER_GUIDE.md](VOLUNTEER_GUIDE.md) |
| Sicherheit | [SECURITY.md](../SECURITY.md) |
| Entwicklung & Tests | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) |
