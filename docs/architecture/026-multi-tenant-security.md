# ADR-026: Multi-Tenant Security

| Feld | Wert |
|------|------|
| **Status** | Accepted (Phase 0 – Architektur) |
| **Datum** | 2026-07-09 |
| **Version** | 2.0 |
| **Abhängigkeiten** | ADR-020, ADR-021, ADR-023, ADR-025 |

## Problem

Multi-Tenant-Systeme sind anfällig für Datenlecks zwischen Mandanten, Host-Header-Manipulation, Subdomain-Hijacking und fehlkonfigurierte CORS/CSRF-Policies. Der Single-Tenant-Ist-Zustand hat diese Risiken nicht adressiert.

## Motivation

Bevor Mandantendaten in einer gemeinsamen Datenbank liegen, muss ein **umfassendes Sicherheitskonzept** die Isolation auf allen Ebenen (Netzwerk, HTTP, Auth, DB, Dateien) definieren.

## Entscheidung

### Sicherheitsschichten

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Netzwerk / Reverse Proxy    TLS, Trusted Proxies          │
├─────────────────────────────────────────────────────────────┤
│ 2. Host-Validierung            TenantResolver, allowedDomains│
├─────────────────────────────────────────────────────────────┤
│ 3. TenantContext               Kein tenant_id in Requests    │
├─────────────────────────────────────────────────────────────┤
│ 4. Authentifizierung           Scope-Trennung platform/tenant│
├─────────────────────────────────────────────────────────────┤
│ 5. Autorisierung               Permissions im Mandanten-Scope│
├─────────────────────────────────────────────────────────────┤
│ 6. Datenbank                   tenant_id-Filter in Repos     │
├─────────────────────────────────────────────────────────────┤
│ 7. Dateisystem                 Upload-Pfade mit tenant_id      │
└─────────────────────────────────────────────────────────────┘
```

### Tenant Isolation

| Maßnahme | Beschreibung |
|----------|--------------|
| Kein `tenant_id` in API-Requests | Serverseitige Auflösung nur über Resolver |
| Repository-Enforcement | Basisklasse `TenantScopedRepository` mit automatischem `where: { tenantId }` |
| Service-Validierung | `TenantContext.require()` auf allen mandantenbezogenen Routen |
| Cross-Tenant-Tests | Integrationstests: Mandant A darf ID von Mandant B nicht abrufen |
| Audit | Jeder Zugriff auf fremde `tenant_id` wird geloggt und blockiert |

### Host Header Validation

| Regel | Implementierung |
|-------|-----------------|
| Erlaubte Hosts | `PlatformSettings.allowedDomains` |
| Forwarded Headers | Nur von `TRUSTED_PROXY_IPS` akzeptiert |
| Host-Mismatch | `400 Bad Request` |
| Unbekannte Subdomain | `404` (ohne Hinweis ob Slug existiert) |
| Host-Header-Spoofing ohne Proxy | Direkte Requests an Backend-Port in Produktion blockiert |

### Subdomain Hijacking

| Maßnahme | Beschreibung |
|----------|--------------|
| Reservierte Subdomains | `www`, `api`, `platform`, `admin`, `mail`, `cdn`, `static` |
| Slug-Validierung | Nur `[a-z0-9-]`, 3–63 Zeichen, keine führenden/abschließenden Bindestriche |
| Freigabe-Workflow | Neuer Mandant: Status `PENDING` bis Plattform-Admin aktiviert |
| Subdomain-Änderung | Nur Plattform-Admin; Audit-Log; Cache-Invalidierung |
| DNS-TTL | Dokumentation: CNAME erst nach Aktivierung setzen |

### CORS

| Aspekt | Strategie |
|--------|-----------|
| Wildcard Subdomains | Dynamische Validierung: Origin muss `*.baseDomain` oder in `allowedOrigins` sein |
| Platform Domain | `https://festmanager.org` explizit erlaubt |
| Mandanten-Subdomains | `https://{subdomain}.festmanager.org` per Callback |
| Custom Domains (Phase 3) | Pro Mandant in `tenant.customDomains` registriert |
| Credentials | `credentials: true` – erfordert explizite Origin (kein `*`) |
| Preflight | Cache-Control für OPTIONS-Responses |

**Geplante Implementierung:**

```typescript
cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Same-origin / Server
    if (isAllowedOrigin(origin, platformSettings)) {
      return callback(null, true);
    }
    return callback(new Error('CORS not allowed'));
  },
  credentials: platformSettings.cors.allowCredentials,
});
```

Socket.IO CORS folgt derselben Policy.

### Cookies

| Cookie | Scope | Attribute |
|--------|-------|-----------|
| `fm_tenant_token` | Mandanten-Subdomain | `HttpOnly`, `Secure`, `SameSite=Lax` |
| `fm_platform_token` | Basis-Domain `/platform` | `HttpOnly`, `Secure`, `SameSite=Strict` |
| Refresh Token | Mandanten-Scope | `Path=/api/auth`, nicht `Domain=.festmanager.org` (Cross-Tenant-Risiko) |

**Entscheidung:** Kein Cookie mit `Domain=.festmanager.org` für Auth-Tokens – verhindert Cross-Tenant-Session-Leak. Jeder Mandant hat isolierte Session auf seiner Subdomain.

### CSRF

| Aspekt | Strategie |
|--------|-----------|
| SameSite Cookies | Primärer Schutz (`Lax`/`Strict`) |
| CSRF-Token | Für state-changing Requests ohne Custom Header |
| Origin-Check | Middleware prüft `Origin`/`Referer` gegen erlaubte Domains |
| API-Clients | `Authorization: Bearer` (kein Cookie) – CSRF nicht anwendbar |

### Authentifizierung

| Thema | Auswirkung |
|-------|------------|
| **Sessions** | `UserSession` erhält `tenantId` und `scope` |
| **JWT** | Claims: `{ sub, tenantId?, scope, role }` – `tenantId` nur bei `scope=tenant` |
| **Refresh Tokens** | Mandanten-gebunden; Rotation bei Refresh |
| **Hostwechsel** | Login auf `asv-libelle.festmanager.org` gilt nicht auf `other.festmanager.org` |
| **Subdomains** | Kein SSO über Subdomains ohne explizites OAuth (Phase 3) |
| **Plattform-Login** | Separater JWT-Scope; eigene Session-Tabelle optional |

### Rate Limits

| Endpoint | Limit | Key |
|----------|-------|-----|
| Öffentliche Bestellung | 10/min | `tenantId + IP` |
| Login | 5/min | `tenantId + IP` oder `IP` (Plattform) |
| API allgemein | 100/min | `tenantId + IP` |
| Resolver (unbekannte Subdomain) | 30/min | `IP` |
| Datei-Upload | 5/min | `tenantId + User` |

Bestehende `rateLimit.ts` wird um `tenantId` aus `TenantContext` erweitert.

### Dateiupload

| Aspekt | Strategie |
|--------|-----------|
| Speicherpfad | `/uploads/{tenantId}/logos/`, `/uploads/{tenantId}/food/` |
| Validierung | MIME-Type, Größe, keine ausführbaren Extensions |
| URL-Auslieferung | `/api/public/uploads/...` mit TenantContext-Prüfung |
| Cross-Tenant-Zugriff | Pfad muss mit `TenantContext.tenantId` beginnen |
| Volume | Docker-Volume `uploads_data` – Mandanten-Unterverzeichnisse |

### API Isolation

| Regel | Beschreibung |
|-------|--------------|
| Plattform-API | `/api/platform/*` – kein TenantContext, `PLATFORM_ADMIN` |
| Mandanten-API | `/api/*` – TenantContext required |
| Öffentliche API | `/api/public/*` – TenantContext aus Resolver |
| IDOR-Schutz | Ressourcen-IDs immer mit `tenant_id` in Query |
| Webhooks (Payment) | Tenant aus Stripe-Metadata oder Signatur-Lookup |

## Alternativen

| Alternative | Bewertung |
|-------------|-----------|
| `Domain=.festmanager.org` Cookie | Einfaches SSO, aber Cross-Tenant-Leak → abgelehnt |
| `tenant_id` im JWT allein | Öffentliche Routen ohne JWT nicht abgedeckt → nur ergänzend |
| CORS `*` | Mit Credentials unmöglich; unsicher → abgelehnt |
| Nur Application-Level-Isolation | Ausreichend für Phase 1; RLS optional Phase 3 |

## Auswirkungen

- CORS wird dynamisch aus PlatformSettings
- Auth-System erhält Scope-Trennung
- Upload-Pfade werden umstrukturiert
- Rate Limits mandantenscharf
- Security-Tests in `tests/security/` erweitern

## Risiken

| Risiko | Mitigation |
|--------|------------|
| Cross-Tenant-Datenleck | Repository-Enforcement; Penetrationstests |
| Session-Fixation | Token-Rotation; Secure-Cookies |
| DDoS über Subdomain-Enumeration | Negative Cache; Rate Limits |
| Fehlkonfigurierter Reverse Proxy | Dokumentation; Startup-Validierung |

## Spätere Erweiterungen

- PostgreSQL Row-Level Security
- MFA für Plattform-Admins
- Web Application Firewall (WAF)
- Mandanten-spezifische IP-Allowlists
- OAuth2/OIDC für Enterprise-SSO
- Security-Header (CSP, HSTS) mandantenspezifisch

## Verwandte ADRs

- [020 – Multi-Tenant Platform](./020-multi-tenant-platform.md)
- [021 – Tenant Context](./021-tenant-context.md)
- [023 – Tenant Routing](./023-tenant-routing.md)
- [025 – Platform Settings](./025-platform-settings.md)
- [027 – Multi-Tenant Deployment](./027-multi-tenant-deployment.md)
