# Notification & Communication Review – Abschlussbericht

**Datum:** 9. Juli 2026  
**Version:** 1.0

## Gesamtbewertung

| Kriterium | Bewertung | Anmerkung |
|-----------|-----------|-----------|
| Architektur | **Gut** (nach Refactoring) | Alle Kanäle im Modul; Core nur noch Hooks |
| Textqualität | **Verbessert** | Vereinsfreundliche Sprache, DSGVO-Hinweis |
| Verständlichkeit | **Gut** | Kurze Push-Texte, klare E-Mails |
| Konsistenz | **Gut** | Zentrale Templates, einheitliche Begriffe |
| Wartbarkeit | **Gut** | Locale-Vorbereitung, keine verstreuten Texte |
| Rechtliche Plausibilität | **Akzeptabel** | Sachliche Formulierungen, keine Zusagen |

---

## Architektur-Analyse

### Vorher

- Core rief zuvor `emailService` direkt auf (entfernt)
- Texte in `EmailTemplateService.ts` verstreut und teils technisch („Verkäufer“, lange Rechtstexte)
- Nur `ORDER_PAID` und `KITCHEN_COMPLETED` über Hooks
- Keine Benachrichtigung bei Zahlungsfehlern

### Nachher

```
Core (orderService, orderPayableAdapter, PaymentManager, ModuleManager)
        │ emitAsync(Hooks)
        ▼
notifications/hooks.ts
        ▼
NotificationManager
        ▼
MessageTemplateService ← templates/de.ts
        ▼
Kanäle (SMTP, ntfy, Discord, Slack, Teams)
```

**Kein Fachmodul** versendet E-Mails, Push oder Webhooks direkt.

### Ausnahmen (bewusst, dokumentiert)

| Mechanismus | Grund |
|-------------|--------|
| Socket.IO / RealtimeService | In-App-Live-Updates, keine ausgehende Nachricht |
| Payment-Webhooks (eingehend) | Provider → Backend, nicht Benutzerkommunikation |
| Bondruck-Modul | Physischer Druck, kein Nachrichtenkanal |

---

## Workflow-Übersicht

| Workflow | Status | Hook | Kanal (Standard) | Empfänger |
|----------|--------|------|------------------|-----------|
| Bestellung erstellt | ✅ | ORDER_CREATED | E-Mail | Kunde |
| Bestellung storniert | ✅ | ORDER_CANCELLED | E-Mail | Kunde |
| Zahlung eingegangen | ✅ | ORDER_PAID | optional Team | Verein |
| Küche fertig | ✅ | KITCHEN_COMPLETED | ntfy | Küche |
| Onlinezahlung fehlgeschlagen | ✅ **neu** | PAYMENT_FAILED | ntfy | Team |
| Rückerstattung | ✅ **neu** | PAYMENT_REFUNDED | optional | Team |
| Funktion aktiviert/deaktiviert | ✅ **neu** | MODULE_* | optional | Team |
| Bestellung abgeholt | ➖ | – | – | – |
| Benutzer erstellt | ➖ | – | – | Kein Passwort per E-Mail |
| Passwort zurückgesetzt | ➖ | – | – | Nicht implementiert |
| Veranstaltung erstellt | ➖ | – | – | – |
| Systemfehler / Backup | ➖ | – | – | Monitoring extern |

Details: [notification-communication-flows.md](../architecture/notification-communication-flows.md)

---

## Textverbesserungen

- „Verkäufer“ → **„Ihr Verein“**
- „Checkout“ / „Processing“ → vermieden; **„Onlinezahlung“**, **„Wird bearbeitet“** (UI)
- Kürzere, aktive Sätze in Push-/ntfy-Texten
- Datenschutz-Footer in E-Mails (DSGVO-freundlich, ohne Rechtsberatung)
- Rechtliche Hinweise gekürzt und sachlich formuliert
- Stornierung: klare Unterscheidung Kunde vs. Verein

---

## Durchgeführte Änderungen

### Code

| Datei | Änderung |
|-------|----------|
| `templates/de.ts` | Zentrale deutsche Textvorlagen mit Platzhaltern |
| `templates/render.ts` | Template-Renderer |
| `services/MessageTemplateService.ts` | Ersetzt `EmailTemplateService.ts` |
| `NotificationManager.ts` | Handler für alle Ereignisse, Hook-basiert |
| `hooks.ts` | ORDER_CREATED, ORDER_CANCELLED, PAYMENT_*, MODULE_* |
| `config.ts` / `module.json` | Neue Ereignistypen konfigurierbar |
| `orderService.ts` | Direkte E-Mail-Aufrufe entfernt |
| `orderPayableAdapter.ts` | Direkte E-Mail-Aufrufe entfernt |
| `NotificationService.ts` | Nur noch `isAvailable()` |

### Dokumentation

- `docs/architecture/notification-communication-flows.md` – Ablaufübersicht
- Dieser Bericht

### Tests

- `templates/templates.test.ts` – Template-Rendering
- `notifications.test.ts` – erweitert um neue Ereignisse

---

## Offene Punkte (empfohlen)

1. **Benutzer-Einladung:** Optional E-Mail bei Team-Anlage (ohne Klartext-Passwort, nur Einladungslink)
2. **Bestellung abgeholt:** Optionale Kunden-E-Mail bei PICKED_UP
3. **i18n:** `en.ts` anlegen, wenn internationale Vereine geplant
4. **Kanal-Test UI:** Buttons für ntfy/Discord/Slack (API existiert bereits)
5. **Retry-Strategie:** Konfigurierbare Wiederholung bei SMTP-Fehlern

---

## Akzeptanzkriterien

- [x] Keine direkte Kommunikation außerhalb des Notification-Moduls
- [x] Alle Texte geprüft und verbessert
- [x] Verständliche Sprache für Veranstaltungen
- [x] Einheitlicher Stil über Templates
- [x] Template-System mit Platzhaltern
- [x] Rechtlich sachliche Formulierungen
- [x] Dokumentation der Kommunikationsabläufe

Die Kommunikationsplattform ist nach diesem Review **modular, konsistent und für Veranstaltungen geeignet**.
