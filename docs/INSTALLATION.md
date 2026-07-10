# FestSchmiede – Installationsanleitung

> **Version 2.2.2** – Professioneller interaktiver Installations-Assistent (TUI)

## Schnellstart

### Online (ohne Git-Clone)

```bash
curl -fsSL https://raw.githubusercontent.com/TimUx/FestSchmiede/v2.2.1/install.sh | bash
```

Standard-Installationsverzeichnis:

| Benutzer | Pfad |
|----------|------|
| normaler Benutzer | `~/festschmiede` |
| root | `/opt/festschmiede` |

### Nach Git-Clone

```bash
git clone https://github.com/TimUx/FestSchmiede.git
cd FestSchmiede
./install.sh
```

Der Assistent führt Sie Schritt für Schritt durch die komplette Installation.

## Voraussetzungen

| Anforderung | Minimum | Empfohlen |
|-------------|---------|-----------|
| Betriebssystem | Debian 11+, Ubuntu 20.04+ | Debian 12 / Ubuntu 24.04 |
| RAM | 2 GB | 4 GB+ |
| CPU | 2 Kerne | 4 Kerne |
| Festplatte | 10 GB | 20 GB+ |
| Docker | 24+ (wird ggf. installiert) | Docker CE aktuell |
| Docker Compose | v2 | v2 |

Optional: `dialog` oder `gum` für die TUI-Oberfläche (Debian/Ubuntu: `dialog` ist standardmäßig vorhanden).

## Installations-Assistent

### Ablauf

```mermaid
flowchart TD
    A[Willkommen] --> B[Systemanalyse]
    B --> C[Installationsmodus]
    C --> D[Docker]
    D --> E[Netzwerk]
    E --> F[Reverse Proxy]
    F --> G[Domain]
    G --> H[Plattform]
    H --> I[Datenbank]
    I --> J[Redis]
    J --> K[Mail]
    K --> L[Sicherheit]
    L --> M[Module]
    M --> N[Zusammenfassung]
    N --> O[Installation]
    O --> P[Abschluss]
```

### Schritte im Detail

1. **Systemanalyse** – Distribution, CPU, RAM, Docker, Netzwerke, Ports, Reverse Proxy
2. **Installationsmodus** – Neuinstallation, Upgrade, Migration, Reparatur, Nur Config
3. **Docker** – Erkennung oder automatische Installation
4. **Docker-Netzwerk** – Bestehendes Netzwerk wählen oder neues erstellen
5. **Reverse Proxy** – Traefik, NGINX, Caddy, vorhanden oder keiner
6. **Domain** – Basisdomain, WWW/APP-Subdomains, HTTPS/Let's Encrypt
7. **Plattform** – Name, Zeitzone, Sprache
8. **Datenbank** – Intern (PostgreSQL-Container) oder extern
9. **Redis** – Intern, extern oder keiner
10. **Mail** – SMTP-Konfiguration (optional, kann später in `/platform/email` erfolgen)
11. **Sicherheit** – Automatisch generierte Secrets (JWT, Encryption, Admin-Passwort, …)
12. **Module** – Payment, Legal, Notifications, …
13. **Zusammenfassung** – Bestätigung vor Installation

### Navigation

- **Weiter** – nächster Schritt
- **Zurück** – vorheriger Schritt
- **Abbrechen** – Installation beenden (jederzeit)

## Erzeugte Dateien

| Datei | Beschreibung |
|-------|-------------|
| `.env` | Umgebungsvariablen (chmod 600) |
| `installer/generated/compose.override.yml` | Docker-Compose-Erweiterung |
| `installer/logs/install-*.log` | Installationsprotokoll |
| `.installer-state/` | Wizard-Status und Backups |
| `.installer-state/credentials.txt` | Admin-Zugangsdaten (chmod 600) |

## Installationsmodi

| Modus | Beschreibung |
|-------|-------------|
| Neuinstallation | Komplette Erstinstallation |
| Upgrade | Geführtes Update (Backup → Pull → Health → Rollback) |
| Migration | Wie Upgrade, mit Migrations-Hinweisen |
| Reparatur | Container neu starten + Health |
| Nur Config | `.env` aktualisieren ohne Neuaufbau |

Bei **Upgrade** und **Migration** erstellt der Installer vor dem Container-Start automatisch ein Datenbank-Backup (`backups/`). Das Backend wendet Schema-Änderungen per `prisma migrate deploy` an.

## Geführte Betriebsbefehle (ohne TUI)

Für Updates und Wartung ohne Wizard:

```bash
./install.sh --update      # Backup, Migration, Health, Rollback bei Fehler
./install.sh --validate    # Voraussetzungen prüfen (keine Änderungen)
./install.sh --backup      # Nur Datenbank-Backup
./install.sh --repair      # Neustart + Health
```

Im Installationsverzeichnis ausführen (z. B. `~/festschmiede`). Details: [OPERATIONS.md](./OPERATIONS.md#update-durchführen), [ADR-044](./architecture/044-guided-operations.md).

## Rollback

Bei Fehlern bietet der Installer:

- **Erneut versuchen**
- **Rollback** – vorherige `.env` wiederherstellen
- **Protokoll anzeigen**

Backups unter `.installer-state/backups/`.

## Manuelle Installation (ohne TUI)

```bash
cp .env.example .env
# .env bearbeiten
docker compose pull && docker compose up -d
```

Produktion mit Traefik:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Siehe auch: [DEPLOYMENT.md](./DEPLOYMENT.md), [DOCKER.md](./DOCKER.md)

## Tests

```bash
./installer/tests/run-tests.sh
./installer/tests/operations.test.sh
./installer/tests/restore-dry-run.test.sh
# oder gesamt:
npm run qa:installer
```

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| Docker nicht erreichbar | `sudo systemctl start docker` |
| Port 80/443 belegt | Anderen Dienst stoppen oder Proxy-Modus wählen |
| Backend-Timeout | `docker compose logs backend` prüfen |
| TUI fehlt | `sudo apt install dialog` |

Protokoll: `installer/logs/install-*.log`

## Nach der Installation

1. Plattform-Admin unter `/platform/login` anmelden
2. SMTP unter `/platform/email` konfigurieren (falls nicht im Installer)
3. Mandanten anlegen oder Einrichtungsassistent durchlaufen
4. Backup einrichten: `scripts/backup/postgres-backup.sh`
