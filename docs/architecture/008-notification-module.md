# ADR-008: Notification Module

| Feld | Wert |
|------|------|
| **Status** | Accepted (Phase 7 – mandantenfähig) |
| **Datum** | 2026-07-08 (aktualisiert 2026-07-09) |

## Ziel

Benachrichtigungen (E-Mail, ntfy, Discord, Slack, Teams) als optionales Modul auslagern. Der Core kennt keine Kanäle – nur den `notificationServiceRegistry` Extension Point.

## Motivation

E-Mail lag im Core (`emailService`, `core.email`). Geplant und umgesetzt:

- SMTP vollständig in der WebUI (nicht in Docker)
- ntfy für Vereins-Alerts (z. B. Küche fertig)
- Webhooks für Discord, Slack, Microsoft Teams
- zentrale Ereignis→Kanal-Zuordnung

## Architekturentscheidung

### Architektur

```
Core (orderService, orderPayableAdapter, PaymentManager, ModuleManager)
        │ HookSystem.emitAsync()
        ▼
notifications/hooks.ts
        ▼
NotificationManager → resolveSmtpConfig() → MessageTemplateService → notificationBranding
        ▼
NotificationRegistry → Kanäle
        ▼
notification_deliveries (tenant-scoped Logging)
```

Der Core ruft **keine** Kanäle direkt auf. Benachrichtigungen laufen ausschließlich über Hooks → `NotificationManager`.

**Phase 7:** SMTP-Auflösung Mandant → Plattform-Fallback. Branding, Templates und Delivery-Logging sind tenantbezogen. Siehe [ADR-028](./028-notification-tenant.md).

Zusätzlich reagiert das Modul per Hook auf:

- `ORDER_CREATED`, `ORDER_CANCELLED` – Kunden-E-Mails
- `ORDER_PAID`, `KITCHEN_COMPLETED` – Team-Kanäle
- `PAYMENT_FAILED`, `PAYMENT_REFUNDED` – Zahlungs-Alerts
- `MODULE_ACTIVATED`, `MODULE_DEACTIVATED` – optionale Admin-Hinweise

Wenn das optionale Legal-Modul aktiv ist, ergaenzt `MessageTemplateService` Kunden-E-Mails zusaetzlich um veroeffentlichte Rechtslinks aus dem `legalContentRegistry`.

### Komponenten (`modules/notifications/`)

| Komponente | Datei | Verantwortung |
|------------|-------|---------------|
| `NotificationService` | `services/NotificationServiceImpl.ts` | Extension-Point-Implementierung |
| `NotificationManager` | `NotificationManager.ts` | Dispatch, SMTP-Auflösung, Templates, Health, Delivery-Log |
| `smtpResolver` | `services/smtpResolver.ts` | Mandant/Plattform-SMTP-Fallback |
| `notificationBranding` | `services/notificationBranding.ts` | Logo, Farben, Footer, Signatur |
| `notificationDeliveryRepository` | `repositories/notificationDeliveryRepository.ts` | Versandprotokoll pro Mandant |
| `NotificationRegistry` | `NotificationRegistry.ts` | Kanal-Registry |
| Settings | `module.json` → `module.notifications` | SMTP, Webhooks, Ereignisse |
| Hooks | `hooks.ts` | `ORDER_PAID`, `KITCHEN_COMPLETED` |
| Migration | `migrateLegacyEmail.ts` | `core.email` → Modul |

### Kanäle

| Kanal | ID | Konfiguration |
|-------|-----|---------------|
| E-Mail (SMTP) | `email` | `smtp.*` (Mandant) oder `platform.smtp.*` (Fallback) |
| ntfy | `ntfy` | Server-URL, Topic, optional Token |
| Discord | `discord` | Webhook-URL (verschlüsselt) |
| Slack | `slack` | Webhook-URL (verschlüsselt) |
| Microsoft Teams | `teams` | Webhook-URL (verschlüsselt) |

### Ereigniszuordnung

| Ereignis | Standard-Kanäle | Auslöser |
|----------|-----------------|----------|
| `orderCreated` | E-Mail | Hook `ORDER_CREATED` |
| `orderCancelled` | E-Mail | Hook `ORDER_CANCELLED` |
| `orderPaid` | optional Team | Hook `ORDER_PAID` |
| `kitchenCompleted` | ntfy | Hook `KITCHEN_COMPLETED` |
| `paymentFailed` | ntfy | Hook `PAYMENT_FAILED` |
| `paymentRefunded` | optional | Hook `PAYMENT_REFUNDED` |
| `moduleActivated` / `moduleDeactivated` | optional | Hook `MODULE_*` |

Ablaufdetails: siehe Abschnitt „Hooks & Kanäle“ in diesem ADR.

### Admin-UI

Pfad: **Administration → Module → Notifications → SMTP → Verbindung testen → Speichern**

- Metadata-first: `/admin/settings/module.notifications`
- SMTP-Test-Extension in `frontend/src/admin/settingsExtensions.tsx`
- API: `POST /api/modules/features/notifications/admin/smtp/test`

### Deaktivierungsverhalten

| Zustand | Verhalten |
|---------|-----------|
| Modul deaktiviert | Keine Benachrichtigungen (kein Legacy-Fallback) |
| Modul aktiviert, kein Kanal | Keine Benachrichtigungen |
| Modul installiert | Settings editierbar; SMTP-Test-API ohne Aktivierung (`requireActivation: false`) |
| Legacy `/admin/email` | Entfernt aus Core-Settings; API delegiert an Modul wenn installiert |

### Konfiguration

- Namespace: `module.notifications`
- Secrets: `APP_ENCRYPTION_KEY` (nicht Docker)
- Migration: bestehende `core.email`-Werte werden bei Modul-`initialize` übernommen

## Vorteile

- Core schlanker – keine SMTP-Felder mehr in Core-Admin
- Neue Kanäle ohne Core-Release
- Einheitliches Settings- und Test-Muster wie Payment-Modul

## Nachteile

- Bestehende `/admin/email`-Bookmarks müssen auf Modul-Settings umgestellt werden
- Web Push (PWA) noch offen

## Alternativen

| Alternative | Bewertung |
|-------------|-----------|
| E-Mail im Core belassen | Widerspricht Modul-Strategie |
| Externer Service (SendGrid) | Kosten, Datenschutz – später als Kanal möglich |

## Auswirkungen

- Core emittiert nur Hooks; `NotificationManager` im Modul versendet alle Nachrichten
- `core.email` Schema aus Core-Admin entfernt (Legacy-Store bleibt für Migration)
- `clubService` E-Mail-API proxyt zu `module.notifications` wenn installiert

## Implementierungsstatus

| Komponente | Status |
|------------|--------|
| NotificationServiceRegistry | ✅ |
| SMTP / E-Mail | ✅ |
| ntfy | ✅ |
| Discord / Slack / Teams | ✅ |
| Hook-Subscriber | ✅ |
| Admin Settings + SMTP-Test | ✅ auch bei installiertem Modul (`requireActivation: false`) |
| Legacy-Migration | ✅ |
| Mandanten-SMTP + Plattform-Fallback | ✅ Phase 7 |
| Tenant-Branding in E-Mails | ✅ Phase 7 |
| Delivery-Logging | ✅ Phase 7 |
| Web Push | ⏳ offen |

## Offene Punkte

- [ ] Web Push (PWA, VAPID)
- [ ] Retry/Dead-Letter bei fehlgeschlagenen Sends
- [ ] DSGVO: Einwilligung für Marketing-Push
- [ ] Template-Sprache (nur DE)
