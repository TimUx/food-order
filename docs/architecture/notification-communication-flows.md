# Kommunikationsabläufe – Benachrichtigungsmodul

Übersicht aller ausgehenden Benachrichtigungen der Plattform.  
**Architektur:** Core emittiert Hooks → `NotificationManager` → Kanäle (E-Mail, ntfy, Discord, Slack, Teams).

## Legende

| Spalte | Bedeutung |
|--------|-----------|
| **Ereignis** | Auslöser im System |
| **Hook** | Plattform-Hook |
| **Empfänger** | Zielgruppe |
| **Kanal** | Standard (konfigurierbar) |
| **Wiederholung** | Keine automatischen Retries (synchroner Versand) |
| **Fehler** | Log-Warnung + `notification_deliveries`, Bestellablauf wird nicht blockiert |
| **SMTP** | Mandant → Plattform-Fallback |
| **Logging** | Tenant-scoped in `notification_deliveries` |

---

## Bestellungen

### Bestellung erstellt

```
Onlinezahlung abgeschlossen / Barzahlung sofort
        ↓
ORDER_CREATED
        ↓
Bestellbestätigung (Template: orderCreated)
        ↓
E-Mail an Kunden
```

| Feld | Wert |
|------|------|
| Empfänger | Kunde (nur bei angegebener E-Mail) |
| Standard-Kanal | E-Mail |
| Inhalt | Abholnummer, Speisen, Veranstaltungstag, Stornierungsfrist, Status-Link |
| Fehlerbehandlung | `logger.warn`, Bestellung bleibt gültig |

### Bestellung storniert

```
Status → CANCELLED (Online-Bestellung)
        ↓
ORDER_CANCELLED
        ↓
Stornierungsbestätigung (Template: orderCancelled)
        ↓
E-Mail an Kunden
```

| Feld | Wert |
|------|------|
| Empfänger | Kunde mit E-Mail |
| Unterscheidung | Kunden- vs. Vereinsstornierung im Text |
| Standard-Kanal | E-Mail |

### Zahlung eingegangen

```
Onlinezahlung erfolgreich
        ↓
ORDER_PAID
        ↓
Zahlungshinweis (Template: orderPaid)
        ↓
ntfy / Discord / Slack / Teams (optional)
```

| Feld | Wert |
|------|------|
| Empfänger | Küche / Verein (Team-Kanäle) |
| Standard-Kanal | alle aus |
| Hinweis | Bestellbestätigung erfolgt separat bei ORDER_CREATED |

### Küche fertig

```
Status → READY
        ↓
KITCHEN_COMPLETED
        ↓
Abholhinweis (Template: kitchenCompleted)
        ↓
ntfy (Standard)
```

| Feld | Wert |
|------|------|
| Empfänger | Küchenpersonal / Abholteam |
| Text | Kurz: „Bestellung 043 ist fertig“ |

### Bestellung abgeholt

```
Status → PICKED_UP
        ↓
ORDER_STATUS_CHANGED (keine Benachrichtigung)
```

Aktuell keine Kundenbenachrichtigung – Abholung erfolgt vor Ort.

---

## Zahlung

### Onlinezahlung fehlgeschlagen

```
Payment-Webhook / Provider-Fehler
        ↓
PAYMENT_FAILED
        ↓
Fehlermeldung (Template: paymentFailed)
        ↓
ntfy (Standard)
```

| Feld | Wert |
|------|------|
| Empfänger | Administratoren / Kasse |
| Text | „Onlinezahlung fehlgeschlagen – Bestellung 042“ |

### Rückerstattung

```
Admin-Rückerstattung
        ↓
PAYMENT_REFUNDED
        ↓
Rückerstattungshinweis (Template: paymentRefunded)
        ↓
optional ntfy
```

---

## Verwaltung

### Funktion aktiviert / deaktiviert

```
Modul aktiviert/deaktiviert
        ↓
MODULE_ACTIVATED / MODULE_DEACTIVATED
        ↓
Kurzmeldung an Team-Kanäle (optional, Standard: aus)
```

### Benutzer erstellt / Passwort zurückgesetzt

**Nicht implementiert** – kein E-Mail-Versand für Zugangsdaten (bewusst: keine Passwörter per E-Mail).

### Veranstaltung erstellt

**Keine Benachrichtigung** – `EVENT_CREATED` ohne Subscriber.

### Systemfehler / Backup

**Nicht implementiert** – Betriebs-Alerts außerhalb des Moduls (Docker/Monitoring).

---

## Nicht über das Benachrichtigungsmodul

| Mechanismus | Zweck |
|-------------|--------|
| Socket.IO / RealtimeService | Live-Aktualisierung in Küche, Abholung, Kundenstatus |
| Payment-Webhooks (eingehend) | Zahlungsbestätigung von Stripe o. Ä. |
| Bondruck-Modul | Küchenbon (Drucker, keine Nachricht) |

---

## Templates

Alle Texte liegen zentral unter:

```
backend/modules/notifications/templates/de.ts
backend/modules/notifications/services/MessageTemplateService.ts
```

Platzhalter: `{{clubName}}`, `{{displayNumber}}`, …  
Mehrsprachigkeit: Locale-Dateien nach gleichem Muster (z. B. `en.ts`).
