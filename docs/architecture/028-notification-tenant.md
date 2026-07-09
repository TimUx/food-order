# ADR-028: Mandantenfähige Benachrichtigungen (Phase 7)

| Feld | Wert |
|------|------|
| **Status** | Accepted (Phase 7) |
| **Datum** | 2026-07-09 |
| **Bezug** | ADR-008, ADR-025 |

## Ziel

Alle Kommunikationsdienste arbeiten mandantenfähig innerhalb des `TenantContext`. Jeder Veranstalter besitzt getrennte SMTP-Einstellungen, Templates, Branding und Absender. Plattform-SMTP dient als optionaler Fallback.

## SMTP-Architektur

```
TenantConfig (module.notifications.smtp)
        │
        ▼
resolveSmtpConfig()
        │
   ┌────┴────┐
   │         │
Tenant    Platform
SMTP      SMTP (platform.smtp.*)
```

**Priorität:** Mandant → Plattform → kein Versand

`NotificationManager.resolveConfig()` wendet `resolveSmtpConfig()` vor jedem Versand an.

## Branding

- `notificationBranding.ts` – Logo, Farben, Footer, Signatur
- `notificationTenantContext.ts` – öffentliche Basis-URL pro Mandant
- Integration mit Legal-Modul über `legalContentRegistry`

## Delivery Logging

Neue Tabelle `notification_deliveries` mit `tenant_id`-Index. Fehlgeschlagene Versände blockieren keine Geschäftsprozesse.

## Tenant-Webhooks (Vorbereitung)

Geplante Erweiterung für mandantenspezifische HTTP-Webhooks:

```
Hook → NotificationManager → WebhookChannel
                                    ↓
                          tenant_webhooks (geplant)
```

| Komponente | Phase 7 | Zukünftig |
|------------|---------|-----------|
| `TenantWebhookEndpoint` Interface | ✅ | – |
| `tenant_webhooks` Tabelle | – | Persistenz |
| HMAC-Signatur (`secret`) | – | Verifizierung |
| Retry mit Backoff | – | Queue |

Mandantenadministratoren verwalten Webhook-URLs; Plattformadministratoren haben keinen Zugriff.

## Queue-Entscheidung

| Option | Bewertung |
|--------|-----------|
| Synchron (aktuell) | ✅ Ausreichend für Vereinsfest-Volumen |
| Redis/BullMQ | ⏳ Bei >1000 Mails/h oder Retry-Anforderung |

**Entscheidung Phase 7:** Synchroner Versand beibehalten. Delivery-Log ermöglicht spätere Nachverarbeitung.

## Plattform-Benachrichtigungen

`platformNotificationService` – getrennt von Mandanten, nutzt Plattform-SMTP. Phase 7: Interface + Logging.

## Sicherheit

| Risiko | Maßnahme |
|--------|----------|
| SMTP-Credential-Leak | Verschlüsselung, kein Logging von Passwörtern |
| Template Injection | `escapeHtml` für User-Input |
| Cross-Tenant | `requireTenantId()` in Repository |
| HTML in Signaturen | Escaping in `wrapEmailHtml` |

## Auswirkungen

- `NotificationManager` resolved SMTP vor Dispatch
- `MessageTemplateService` nutzt Tenant-URLs und Branding
- Neue Migration `migrateNotificationTenantSchema`
- Plattform-SMTP-Defaults in `platform_settings`

## Offene Punkte

- [ ] Vollständiger Plattform-Benachrichtigungsversand
- [ ] Tenant-Webhooks Persistenz und Admin-UI
- [ ] Async Queue mit Retry
- [ ] Mehrsprachige Templates (EN)
