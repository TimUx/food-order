# ADR-029: Multi-Tenant Security Hardening (Phase 8)

| Feld | Wert |
|------|------|
| **Status** | Accepted (Phase 8) |
| **Datum** | 2026-07-09 |
| **Bezug** | ADR-026, ADR-028 |

## Ziel

Systematisches Security Review und Härtung der Multi-Tenant-Plattform vor produktivem Betrieb.

## Umgesetzte Maßnahmen

### Host Validation

- `X-Forwarded-Host` nur bei aktiviertem Trust Proxy (`TRUSTED_PROXY_HOPS > 0`)
- Nginx setzt `X-Forwarded-Host` aus `$host` (nicht client-supplied)

### Tenant Isolation

- Kein Default-Tenant-Fallback auf Plattform-Host für mandantenspezifische APIs
- Uploads nur bei übereinstimmendem Mandanten-Kontext (`uploadAccess` Middleware)
- Legacy `ClubSettings`-Fallback ohne Tenant-Prüfung entfernt
- JWT enthält `tenantId`; Cross-Tenant-Token werden abgewiesen

### WebSockets

- Tenant-Auflösung per Handshake-Host
- Rooms immer `tenant:{id}:…`
- Session-Validierung analog HTTP
- Pickup-Board und Event-Joins nur für Staff mit Tenant-Event-Prüfung
- Keine globalen `io.emit()`-Fallbacks

### Auth & Sessions

- Impersonation: Plattform-Session-Validierung, TTL 30 Min
- `revoke-all`: Benutzer muss im aktuellen Mandanten existieren
- Passwort-Mindestlänge: 8 Zeichen

### Rate Limiting

Erweitert um: Auth refresh/logout, Uploads, Payment public, Webhooks, Order status lookup

### Secrets & Logging

- `PLATFORM_ADMIN_PASSWORD` Pflicht in Produktion
- Audit-Fallback redacted sensitive Felder

### Information Disclosure

- `/api/openapi.json` in Produktion deaktiviert

## Restrisiken

| Risiko | Status |
|--------|--------|
| JWT in localStorage (XSS) | Akzeptiert; CSP empfohlen |
| In-Memory Rate Limits (Multi-Replica) | Redis-Backend geplant |
| Passwort-Reset-Flow | Noch nicht implementiert |
| Async Notification Queue | Phase 7 dokumentiert |

## Auswirkungen

Keine Breaking Changes für korrekt konfigurierte Mandanten (Subdomain/Pfad-Routing). Apex-Domain-Zugriff auf mandantenspezifische APIs ohne Routing-Kontext wird abgewiesen.
