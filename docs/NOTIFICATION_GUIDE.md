# Notification Guide – Mandantenfähige Kommunikation (Phase 7)

Technischer Leitfaden für das Notification-Modul in der Multi-Tenant-Plattform v2.0.

## Architektur

```
Core (Hooks)
    ↓
notifications/hooks.ts
    ↓
NotificationManager (TenantContext)
    ↓
resolveSmtpConfig() → MessageTemplateService → notificationBranding
    ↓
NotificationRegistry → Kanäle (email, ntfy, discord, slack, teams)
    ↓
notificationDeliveryRepository (tenantbezogenes Logging)
```

**Regel:** Kein Modul versendet Nachrichten direkt. Alle Benachrichtigungen laufen über Hooks → `NotificationManager`.

## SMTP

### Priorität

1. **Mandant-SMTP** – wenn `smtp.source !== 'platform'`, `smtp.enabled` und Host gesetzt
2. **Plattform-SMTP** – Fallback aus `platform_settings` (`platform.smtp.*`)
3. **Kein Versand** – wenn weder Mandant noch Plattform konfiguriert

Mandanten können bei Plattform-SMTP weiterhin `from`, `senderName` und `replyTo` überschreiben.

### Mandantenfelder (`module.notifications`)

| Feld | Beschreibung |
|------|-------------|
| `smtp.source` | `tenant` oder `platform` |
| `smtp.host`, `smtp.port`, `smtp.user`, `smtp.pass` | Server-Zugangsdaten |
| `smtp.secure` | SSL (Port 465) |
| `smtp.useTls` | STARTTLS |
| `smtp.from`, `smtp.senderName`, `smtp.replyTo` | Absender |

### Plattformfelder (`platform.smtp.*`)

Verwaltet durch Plattformadministratoren. Standard: deaktiviert.

## Branding

Jeder Mandant konfiguriert unter `branding.*`:

- `primaryColor` – Buttons und Akzente in E-Mails
- `logoUrl` – optional, überschreibt Mandanten-Logo
- `footerText`, `signature` – E-Mail-Fußzeile
- `locale`, `timezone` – Metadaten

`resolveTenantPublicBaseUrl()` liefert mandantenspezifische Links (Subdomain oder Pfad-Präfix).

## Templates

- Basis-Templates: `modules/notifications/templates/de.ts`
- Mandanten-Overrides: `config.templates` (pro Ereignis/Feld)
- Engine: `renderTemplate()` mit Platzhaltern (`{{displayNumber}}`, `{{primaryColor}}`, …)
- Keine hartcodierten URLs – Basis-URL aus TenantContext

### Unterstützte Ereignisse

| Ereignis | Template-Key | Kanal (Standard) |
|----------|--------------|------------------|
| Bestellbestätigung | `orderCreated` | E-Mail |
| Stornierung | `orderCancelled` | E-Mail |
| Zahlung | `orderPaid` | Push-Kanäle |
| Küche fertig | `kitchenCompleted` | ntfy |
| Zahlungsfehler | `paymentFailed` | ntfy |
| Rückerstattung | `paymentRefunded` | optional |
| Modul aktiviert/deaktiviert | `moduleActivated` / `moduleDeactivated` | optional |

## Rechtliche Informationen

Wenn das Legal-Modul aktiv ist, fügt `MessageTemplateService` veröffentlichte Rechtslinks aus `legalContentRegistry` in E-Mail-Footer ein. Links verwenden die Mandanten-Basis-URL.

## Delivery Logging

Tabelle `notification_deliveries` (tenant-scoped):

- `event_type`, `channel_id`, `recipient`, `status`, `error_message`, `smtp_source`

API: `GET /api/modules/features/notifications/admin/deliveries?limit=50`

## Kanäle & Erweiterungen

| Kanal | Status |
|-------|--------|
| E-Mail (SMTP) | ✅ Implementiert |
| ntfy | ✅ Implementiert |
| Discord / Slack / Teams | ✅ Webhook-Kanäle |
| Push | ⏳ Interface vorbereitet (`channelExtensions.ts`) |
| Tenant-Webhooks | ⏳ Architektur dokumentiert (ADR-028) |

## Plattform-Benachrichtigungen

Getrennt von Mandanten: `platformNotificationService` (Logging-Stubs für System-Events).

## Queue-Entscheidung

**Aktuell: synchroner Versand** über `Promise.allSettled` im `NotificationManager`.

**Begründung:** Geringes Volumen pro Mandant, einfache Fehlerbehandlung, keine zusätzliche Infrastruktur.

**Zukünftig:** Bei Skalierung Redis/BullMQ-Queue für Retry, Batch-Versand und Dead-Letter. Siehe ADR-028.

## Sicherheit

- SMTP-Passwörter verschlüsselt (`APP_ENCRYPTION_KEY`)
- Template-Variablen werden escaped (`escapeHtml`)
- Tenant-Isolation über `requireTenantId()` in Delivery-Log
- Kein Cross-Tenant-Zugriff auf Settings

## Tests

```bash
cd backend && npm test -- modules/notifications
```

- `smtpResolver.test.ts` – Tenant/Plattform-Fallback
- `notificationBranding.test.ts` – Branding & HTML-Escaping
- `notificationTenantContext.test.ts` – URL-Auflösung
- `templates.test.ts` – Template-Rendering

## Verwandte Dokumentation

- [ADR-008](./architecture/008-notification-module.md)
- [ADR-028](./architecture/028-notification-tenant.md)
- [Kommunikationsabläufe](./architecture/notification-communication-flows.md)
- [ADMIN_GUIDE](./ADMIN_GUIDE.md) – SMTP-Konfiguration für Vereinsadmins
