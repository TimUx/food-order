# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.5.x   | Yes       |
| 1.4.x   | Yes       |

## Reporting a Vulnerability

Bitte melden Sie Sicherheitslücken **nicht** öffentlich als Issue.

1. E-Mail an den Maintainer (siehe GitHub-Profil des Repository-Besitzers)
2. Beschreibung, Schritte zur Reproduktion, Auswirkung
3. Antwort innerhalb von 7 Werktagen

## Sicherheitshinweise für Betreiber

- Setzen Sie `JWT_SECRET` und `APP_ENCRYPTION_KEY` (jeweils min. 32 Zeichen) in Produktion
- Postgres nicht öffentlich exponieren (Standard in `docker-compose.yml`: nur intern)
- HTTPS vor der Anwendung terminieren
- Regelmäßige Backups (`scripts/backup/postgres-backup.sh`) und getestete Wiederherstellung (`scripts/backup/postgres-restore.sh`)
- `npm audit` und Dependency-Review-Workflow nutzen
- Demo-Zugangsdaten nach dem Seed **sofort** durch eigene Passwörter ersetzen
- Betriebshandbuch: [docs/OPERATIONS.md](docs/OPERATIONS.md)

## Bekannte Schutzmaßnahmen

- Rate Limiting auf Login und öffentliche Bestellungen
- Bot-Schutz auf Bestellungen (Honeypot, Timing, optional Cloudflare Turnstile)
- Socket.IO-Authentifizierung für Mitarbeiter-Räume
- Stripe-Webhook-Signaturprüfung
- Verschlüsselte Modul-Settings (AES-256-GCM)
- Upload-Filter: MIME-Typ-Whitelist, Größenlimit (5 MB), zufällige Dateinamen

## Upload-Härtung (Logo & Speisenbilder)

| Maßnahme | Status |
|----------|--------|
| MIME-Whitelist (JPEG, PNG, WebP, GIF) | Implementiert |
| Maximale Dateigröße | 5 MB |
| Zufällige Speichernamen (UUID) | Implementiert |
| Bild-Re-Encoding / Stripping von Metadaten | Geplant (M4) |
| Restriktive `Content-Disposition` / CSP für `/uploads` | Geplant (M4) |
| Keine Ausführung aus Upload-Verzeichnis | Container läuft als Nicht-Root-User |

**Empfehlung:** Nur vertrauenswürdige Admins dürfen Bilder hochladen; Server nicht ohne HTTPS betreiben.

## Session & Token-Lebenszyklus

- Mitarbeiter-Login nutzt **JWT** mit konfigurierbarer Laufzeit (`JWT_EXPIRES_IN`, Standard 8h).
- Deaktivierte Benutzer werden bei geschützten Routen mit `loadUser` abgewiesen (401), solange ein neuer Request mit gültigem Token erfolgt — **bereits ausgestellte Tokens** bleiben bis Ablauf gültig (Revocation geplant, M3).
- **Logout** im Frontend entfernt das Token lokal; serverseitige Sperrliste folgt in einer späteren Version.
- Für sofortigen Entzug bis dahin: Benutzer deaktivieren **und** `JWT_SECRET` rotieren (alle Sessions ungültig — alle müssen sich neu anmelden).

## Bestell- und Status-Privacy

- Öffentliche Bestell-URLs und Statusabfragen können personenbezogene Daten enthalten (Name, Bestellinhalt).
- Lookup per Bestellnummer + Nachname ist rate-limitiert.
- **Geplant (M2):** Lookup-Token statt erratbarer Order-ID in Kundenlinks.
- Bestell- und Zahlungs-IDs nicht in öffentlichen Logs oder Screenshots teilen.
- Abholboard zeigt nur Nummern und Kurzinfo — keine vollständigen Kundendaten.

## Weitere Dokumentation

- [OPERATIONS.md](docs/OPERATIONS.md) — Backup, Restore, Secrets
- [ROADMAP.md](docs/ROADMAP.md) — geplante Sicherheitsmaßnahmen
