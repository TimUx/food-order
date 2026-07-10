# ADR 033: Passwortlose Authentifizierung

## Status

Accepted (v2.1.0)

## Kontext

Ehrenamtliche Nutzer sollen sich ohne Passwort merken können. Gleichzeitig muss klassische Passwort-Anmeldung optional bleiben.

## Entscheidung

### Authentifizierungsmodi (Plattformkonfiguration)

| Modus | Passwort | Magic Link | Login-Code |
|-------|----------|------------|------------|
| `passwordless_only` | Nein | Ja | Ja |
| `password_only` | Ja | Nein | Nein |
| `password_or_magic` | Ja | Ja | Ja |
| `password_and_magic` | Ja | Ja | Ja |

Standard bei Neuinstallation: `password_or_magic` (Abwärtskompatibilität). Empfohlen für neue Deployments: `passwordless_only`.

### Technik

- `AuthLoginToken` Modell für Magic Links und Login-Codes
- Tokens: kryptographisch sicher (32 Byte), SHA-256 Hash in DB
- Einmalnutzung, kurze Gültigkeit (konfigurierbar)
- Rate Limiting: 5 Anfragen / 15 Min. (`magicLinkRateLimiter`)
- Audit Logging über `AuditService`
- `User.passwordHash` optional (nullable)

### API

- `POST /api/auth/magic-link` – Link anfordern
- `POST /api/auth/login-code` – Code anfordern
- `POST /api/auth/verify-magic-link` – Token einlösen
- `POST /api/auth/verify-login-code` – Code einlösen
- `GET /api/public/auth-config` – öffentliche Modus-Konfiguration

## Sicherheit

- Keine Benutzer-Enumeration (immer `{ sent: true }`)
- Automatische Invalidierung vorheriger Tokens pro User
- IP/User-Agent werden protokolliert

## Konsequenzen

- Login-Seite zeigt nur erlaubte Verfahren
- Mail-Templates: `login-code`, `magic-link`
- Plattformadministrator steuert Modi zentral unter `/platform/email`
