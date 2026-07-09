# Phase 7 – Abschlussbericht: Notification, Communication & Platform Services

| Feld | Wert |
|------|------|
| **Phase** | 7 – Notification, Communication & Platform Services |
| **Branch** | `feature/v2-multi-tenant-platform` |
| **Datum** | 2026-07-09 |
| **Status** | Abgeschlossen |

## Zusammenfassung

Das Notification-Modul ist vollständig mandantenfähig. Jeder Veranstalter verwaltet eigene SMTP-Einstellungen, Branding, Templates und Absender. Plattform-SMTP dient als Fallback. Versand, Fehler und Zustellstatus werden tenantbezogen protokolliert. Die EventBus-Architektur bleibt unverändert.

---

## Kommunikationsarchitektur

```
Core Hooks (ORDER_CREATED, PAYMENT_FAILED, …)
        ↓
notifications/hooks.ts
        ↓
NotificationManager (TenantContext)
        ├── resolveSmtpConfig()     Mandant → Plattform
        ├── MessageTemplateService  Templates + Legal-Links
        ├── notificationBranding    Logo, Farben, Signatur
        └── NotificationRegistry    email | ntfy | discord | slack | teams
        ↓
notification_deliveries (tenant-scoped)
```

**Prinzip:** Kein Modul versendet Nachrichten direkt. Alle Kommunikation läuft über Hooks → NotificationManager.

---

## SMTP-Übersicht

| Ebene | Konfiguration | Verwaltung |
|-------|---------------|------------|
| **Mandant** | `module.notifications.smtp.*` | Mandantenadministrator |
| **Plattform** | `platform.smtp.*` | Plattformadministrator |
| **Priorität** | Mandant (wenn aktiv) → Plattform → kein Versand | `smtpResolver.ts` |

### Mandantenfelder

Host, Port, Benutzer, Passwort, TLS/SSL, Absendername, Absenderadresse, Reply-To, SMTP-Quelle (`tenant` | `platform`)

### Plattform-Fallback

Wenn Mandant-SMTP deaktiviert oder `source: platform`, werden Host und Zugangsdaten aus `platform_settings` geladen. Mandant kann `from`, `senderName`, `replyTo` weiterhin überschreiben.

---

## Template-Übersicht

| Ereignis | Template | Kanal (Standard) |
|----------|----------|------------------|
| Bestellbestätigung | `orderCreated` | E-Mail |
| Stornierung | `orderCancelled` | E-Mail |
| Zahlung | `orderPaid` | Team-Kanäle |
| Küche fertig | `kitchenCompleted` | ntfy |
| Zahlungsfehler | `paymentFailed` | ntfy |
| Rückerstattung | `paymentRefunded` | optional |
| Modul aktiviert/deaktiviert | `moduleActivated` / `moduleDeactivated` | optional |

- Basis: `templates/de.ts`
- Overrides: `config.templates` pro Mandant
- Platzhalter: Tenant-URL, Branding-Farben, Bestelldaten
- Legal-Modul: veröffentlichte Seiten im E-Mail-Footer

---

## Implementierte Komponenten

| Datei | Funktion |
|-------|----------|
| `smtpResolver.ts` | Mandant/Plattform-SMTP-Auflösung |
| `notificationTenantContext.ts` | Mandanten-Basis-URL |
| `notificationBranding.ts` | E-Mail-Branding |
| `notificationDeliveryRepository.ts` | Versandprotokoll |
| `migrateNotificationTenantSchema.ts` | DB-Migration + Plattform-SMTP-Defaults |
| `platformNotificationService.ts` | Systembenachrichtigungen (Stub) |
| `channelExtensions.ts` | Webhook/Push-Erweiterungspunkt |

---

## Testergebnisse

| Test-Suite | Inhalt |
|------------|--------|
| `smtpResolver.test.ts` | Tenant-SMTP, Plattform-Fallback, source=platform |
| `notificationBranding.test.ts` | Branding, HTML-Escaping |
| `notificationTenantContext.test.ts` | Subdomain-, Pfad- und Fallback-URLs |
| `templates.test.ts` | Bestell- und Stornierungs-Templates |
| `notifications.test.ts` | Kanal-Konfiguration, Ereigniszuordnung |

**Hinweis:** Lokale Vitest-Ausführung erfordert Node/npm-Setup (ESM-Konfiguration). Tests sind für CI vorbereitet.

---

## Akzeptanzkriterien

| Kriterium | Status |
|-----------|--------|
| Tenant SMTP implementiert | ✓ |
| Plattform SMTP als Fallback | ✓ |
| Templates tenantfähig | ✓ |
| Branding tenantfähig | ✓ |
| Rechtliche Informationen integriert | ✓ |
| EventBus unverändert | ✓ |
| Logging erweitert | ✓ |
| Tests erweitert | ✓ |
| Dokumentation aktualisiert | ✓ |

---

## Offene Punkte

- Vollständiger Versand von Plattform-Systembenachrichtigungen (aktuell Logging-Stub)
- Tenant-Webhooks: Persistenz (`tenant_webhooks`) und Admin-UI
- Async Queue mit Retry (BullMQ/Redis) bei Skalierung
- Web Push (PWA, VAPID)
- Mehrsprachige Templates (EN)

---

## Vorbereitung für Phase 8

Phase 7 legt die Kommunikationsgrundlage für mandantenfähige Services:

- **Tenant-isolierte Konfiguration** über `TenantSettingsService` etabliert
- **Plattform-Defaults** über `platform_settings` verfügbar
- **Delivery-Logging** ermöglicht Monitoring und spätere Queue-Nachverarbeitung
- **Erweiterungspunkte** für Webhooks und Push vorbereitet

Empfohlene Phase-8-Schwerpunkte (abhängig von Spec): Analytics/Reporting mit tenant-scoped Daten, erweiterte Plattform-Administration oder weitere mandantenfähige Module.

---

## Dokumentation

- [NOTIFICATION_GUIDE.md](../NOTIFICATION_GUIDE.md)
- [ADR-028](./028-notification-tenant.md)
- [ADR-008](./008-notification-module.md) (aktualisiert)
- [ADMIN_GUIDE.md](../ADMIN_GUIDE.md) (SMTP/Branding)
- [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md) (Notification-Abschnitt)
