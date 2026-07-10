# FestSchmiede 2.1.0 – Plattform-Mail, Setup-Assistent & moderne Authentifizierung

**Veröffentlichung:** 2026-07-10

## Highlights

### Zentrale Mailarchitektur

- SMTP-Konfiguration ausschließlich in der Plattformverwaltung unter **Plattform → E-Mail**
- Neuer zentraler `MailService` für alle E-Mail-Versände
- Verbindungstest, Testmail und Mail-Queue-Status (24h)
- Mandanten behalten nur Branding-Overrides (Absendername, Reply-To)

### Initial-Setup-Assistent

- 7-stufiger Einrichtungsassistent für neue Mandanten
- Automatischer Start beim ersten Admin-Login
- Optionale erste Veranstaltung
- Neustart über Administration möglich

### Modernes Login-Konzept

- Passwortlose Anmeldung per Magic Link oder Login-Code (Standard empfohlen)
- Vier konfigurierbare Authentifizierungsmodi
- Rate Limiting und Audit Logging
- Angepasste Login-Seite je nach Plattformkonfiguration

## Neue API-Endpunkte

- `GET /api/platform/mail` – SMTP & Auth-Konfiguration
- `PUT /api/platform/mail/smtp` – SMTP aktualisieren
- `PUT /api/platform/mail/auth` – Auth-Modus aktualisieren
- `POST /api/platform/mail/test-connection` – SMTP-Verbindung testen
- `POST /api/platform/mail/test` – Testmail senden
- `GET /api/platform/mail/queue` – Mail-Queue-Status
- `GET /api/public/auth-config` – Öffentliche Auth-Konfiguration
- `POST /api/auth/magic-link`, `/login-code`, `/verify-magic-link`, `/verify-login-code`
- `GET/POST /api/setup/*` – Setup-Assistent

## Migration

- Bestehende Mandanten werden als „eingerichtet“ markiert
- Auth-Modus standardmäßig `password_or_magic` für Abwärtskompatibilität
- `User.passwordHash` ist nun optional

## ADRs

- [031 – Zentraler MailService](./architecture/031-central-mail-service.md)
- [032 – Initial Setup Wizard](./architecture/032-initial-setup-wizard.md)
- [033 – Passwortlose Authentifizierung](./architecture/033-passwordless-authentication.md)
