# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.0.x   | Yes       |
| 1.5.x   | Yes       |

## Reporting a Vulnerability

Bitte melden Sie Sicherheitslücken **nicht** öffentlich als Issue.

1. E-Mail an den Maintainer (siehe GitHub-Profil des Repository-Besitzers)
2. Beschreibung, Schritte zur Reproduktion, Auswirkung
3. Antwort innerhalb von 7 Werktagen

## Sicherheitsmodell (Multi-Tenant v2.0)

### Tenant Isolation

- Alle Datenzugriffe über `tenantWhere()` / `requireTenantId()`
- Mandanten-Kontext aus Host (Subdomain/Pfad-Präfix) — kein Fallback auf Default-Tenant auf Plattform-Host
- JWT enthält `tenantId`; Cross-Tenant-Tokens werden abgewiesen
- Uploads nur bei übereinstimmendem Mandanten-Kontext
- WebSocket-Räume: `tenant:{id}:…`

### Plattform vs. Mandant

| Ebene | Auth | APIs |
|-------|------|------|
| Plattformadmin | `scope: platform` | `/api/platform/*` |
| Mandant | `scope: tenant` | `/api/staff/*`, `/api/admin/*` |
| Öffentlich | Keine / Lookup-Token | `/api/public/*` |

### Host Validation

- `X-Forwarded-Host` nur bei `TRUSTED_PROXY_HOPS > 0`
- Reverse Proxy muss `X-Forwarded-Host` aus `$host` setzen (nicht client-supplied)
- Ungültige Hosts → 400

## Pflicht-Secrets in Produktion

| Variable | Anforderung |
|----------|-------------|
| `JWT_SECRET` | min. 32 Zeichen, keine Defaults |
| `APP_ENCRYPTION_KEY` | min. 32 Zeichen, keine Defaults |
| `PLATFORM_ADMIN_PASSWORD` | min. 16 Zeichen, keine Defaults |
| `POSTGRES_PASSWORD` | Stark, nicht `festschmiede` |
| `TURNSTILE_SECRET_KEY` | Empfohlen für öffentliche Bestellungen |

`assertProductionSecrets()` blockiert Start ohne gültige JWT/Encryption/Platform-Admin-/Postgres-Passwörter.  
`assertProductionCors()` blockiert Start bei Wildcard-CORS oder fehlenden HTTPS-Origins (nach Plattform-Bootstrap).

### Secret-Rotation

| Secret | Rotation | Hinweis |
|--------|----------|---------|
| `JWT_SECRET` | Alle Sessions invalidieren | Benutzer neu anmelden; geplantes Wartungsfenster |
| `APP_ENCRYPTION_KEY` | Daten re-encrypt | Modul-Settings mit `migrateLegacySecrets`; Backup vorher |
| `PLATFORM_ADMIN_PASSWORD` | Plattform-Login | In `.env` ändern, Container neu starten |
| `POSTGRES_PASSWORD` | DB + `DATABASE_URL` | Backup, Passwort in Postgres + `.env`, Stack neu starten |

Ausführlich: [OPERATIONS.md — Secret-Rotation](docs/OPERATIONS.md#secret-rotation)

## Schutzmaßnahmen

| Maßnahme | Status |
|----------|--------|
| Rate Limiting (Login, Orders, Lookup, Auth, Upload, Payment, Webhooks) | ✅ |
| Bot-Schutz (Honeypot, Timing, optional Turnstile) | ✅ |
| Socket.IO Tenant-Isolation + Session-Validierung | ✅ Phase 8 |
| Stripe-Webhook-Signaturprüfung | ✅ |
| Verschlüsselte Modul-Settings (AES-256-GCM) | ✅ |
| Upload: MIME-Whitelist, Größenlimit, Tenant-Pfad, Re-Encoding | ✅ |
| Helmet Security Headers | ✅ |
| CORS Allowlist + Prod-Validierung | ✅ ADR-039 |
| Audit-Log Redaction bei DB-Fallback | ✅ Phase 8 |
| OpenAPI in Produktion deaktiviert | ✅ Phase 8 |
| Impersonation: Session-Check, 30min TTL, Audit Start+Ende | ✅ ADR-039 |

## Session & Token

- Mitarbeiter-Login: JWT + Refresh-Token (serverseitige Sessions)
- Session-Revocation über `revoke-all` (tenant-scoped)
- Impersonation: Plattform-Session muss gültig sein
- Deaktivierte Benutzer: `loadUser` + Session-Validierung

## Upload-Härtung

| Maßnahme | Status |
|----------|--------|
| MIME-Whitelist (JPEG, PNG, WebP, GIF) | ✅ |
| Maximale Dateigröße 5 MB | ✅ |
| Zufällige Speichernamen | ✅ |
| Tenant-isolierter Speicherpfad | ✅ |
| Cross-Tenant-Download blockiert | ✅ Phase 8 |
| Bild-Re-Encoding (Metadaten-Stripping) | ✅ |
| Content-Length-Prüfung vor Multer | ✅ ADR-039 |
| Optionaler AV-Hook (`UPLOAD_AV_HOOK`) | ✅ ADR-039 |

## OWASP Top 10 — Bewertung

| Risiko | Status |
|--------|--------|
| Broken Access Control | Gehärtet (Phase 8) |
| Cryptographic Failures | Secrets-Pflicht, bcrypt, AES-GCM |
| Injection | Prisma ORM, Zod-Validierung, Template-Escaping |
| Insecure Design | Tenant-First-Architektur |
| Security Misconfiguration | Prod-Secret- + CORS-Guards, Security-Header-Baseline |
| Vulnerable Components | `npm audit` in CI |
| Auth Failures | Sessions, Rate Limits, Passwort min. 8 |
| Software/Data Integrity | Webhook-Signaturen |
| Logging Failures | Redaction, keine Passwörter in Logs |
| SSRF | Keine User-controlled outbound URLs |

## Weitere Dokumentation

- [PHASE_8_COMPLETION_REPORT](docs/architecture/PHASE_8_COMPLETION_REPORT.md)
- [ADR-029](docs/architecture/029-multi-tenant-security-hardening.md)
- [ADR-039](docs/architecture/039-security-hardening-baseline.md)
- [OPERATIONS.md](docs/OPERATIONS.md)
- [NOTIFICATION_GUIDE](docs/NOTIFICATION_GUIDE.md)
