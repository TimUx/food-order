# ADR-007: Payment Module

| Feld | Wert |
|------|------|
| **Status** | Accepted (Spec 6.1 implementiert) |
| **Datum** | 2026-07-08 |
| **Letzte Aktualisierung** | Spec 6.5 – Release Validation |

## Ziel

Onlinezahlungen als **erstes offizielles Modul** bereitstellen. Das Modul arbeitet ausschließlich mit abstrakten `PayableResource`-Objekten – **ohne Bestellungswissen**.

Der Bestellprozess kennt ausschließlich `PaymentService` – niemals Providernamen.

## Architektur

```
orderService                    paymentServiceRegistry (Extension Point)
     │ isAvailable()?                    │
     │ createCheckout(resource)          │
     ▼                                   ▼
payableResourceRegistry          PaymentServiceImpl
     │ toPayableResource('order')       │
     │ onPaymentCompleted/Failed/       ▼
     │   Cancelled              PaymentManager
orderPayableAdapter                    │
                                       ├── PaymentRegistry → Provider
                                       ├── paymentRepository
                                       ├── paymentAuditRepository
                                       ├── PaymentEventService → EventBus
                                       └── SettingsService (Provider-Konfig)
```

**Das Payment-Modul kennt keine Orders.** Der Core registriert `orderPayableAdapter` am Extension Point `payableResource`.

### PaymentService (öffentliche API)

| Methode | Beschreibung |
|---------|--------------|
| `getAvailablePaymentMethods()` | Zahlungsarten mit `displayName`, `checkoutType`, `icon` – **ohne** Providernamen nach außen |
| `createCheckout(resource)` | Checkout-Session erstellen |
| `cancelCheckout(sessionId)` | Session abbrechen |
| `retryCheckout(sessionId)` | Neue Session bei Fehler/Timeout |
| `getPaymentStatus(sessionId)` | Aktuellen Status abfragen (inkl. Timeout-Prüfung) |
| `verifyWebhook(providerId, payload, headers)` | Signatur + Replay-Schutz |
| `refund(providerId, transactionId)` | Rückerstattung (Admin) |
| `supports(feature)` | Feature-Abfrage |
| `healthCheck()` | Provider-Health inkl. Config/API/Webhook |
| `isResourceReleased` / `filterReleasedIds` | Freigabe-Logik für PayableResources |

## Payment Lifecycle

### Barzahlung (Modul deaktiviert oder kein Provider)

```
Bestellung erzeugen → ORDER_CONFIRMED → IN_KITCHEN
```

### Onlinezahlung

```
Bestellung erzeugen (skipKitchenNotify)
    → CREATED / PAYMENT_PENDING
    → Checkout Session (redirect)
    → Webhook
    → PAYMENT_PROCESSING → PAYMENT_PAID
    → ORDER_CONFIRMED (released_to_kitchen)
    → IN_KITCHEN (Core/Order-Domäne)
```

### Abbruch / Timeout / Fehler

```
Checkout abgebrochen/abgelaufen
    → PAYMENT_CANCELLED / PAYMENT_TIMEOUT / PAYMENT_FAILED
    → onPaymentFailed / onPaymentCancelled
    → Bestellung bleibt in DB, nicht an Küche
```

## Statusmodell

| Status | Bedeutung |
|--------|-----------|
| `CREATED` | Zahlungsdatensatz angelegt |
| `PAYMENT_PENDING` | Checkout erstellt, wartet auf Zahlung |
| `PAYMENT_PROCESSING` | Webhook empfangen, Verarbeitung |
| `PAYMENT_PAID` | Zahlung erfolgreich |
| `PAYMENT_FAILED` | Zahlung fehlgeschlagen |
| `PAYMENT_CANCELLED` | Vom Nutzer abgebrochen |
| `PAYMENT_TIMEOUT` | Session abgelaufen |
| `PAYMENT_REFUNDED` | Rückerstattung |
| `ORDER_CONFIRMED` | Ressource freigegeben (PayableResource-Callback) |
| `IN_KITCHEN` / `READY` / `COLLECTED` | Order-Lifecycle (Core-Domäne) |

## Datenmodell (Modul-Migrationen)

| Tabelle | Zweck |
|---------|-------|
| `payments` | Checkout-Sessions (ehem. `payment_sessions`) |
| `payment_transactions` | Provider-Transaktionen (Zahlung, Refund) |
| `payment_events` | Event-Log + Webhook-Idempotenz (`external_event_id` UNIQUE) |
| `payment_audit` | Audit-Trail (Checkout, Webhook, Erfolg, Fehler, Refund) |
| `payment_provider_config` | Health-Check-Snapshot pro Provider |

Migrationen:
- `001_initial.sql` – Basis-Schema
- `002_payment_spec.sql` – Spec 6.1 Erweiterung

## Eventfluss (EventBus)

| Event | Auslöser |
|-------|----------|
| `PaymentCreated` | Zahlungsdatensatz angelegt |
| `PaymentStarted` | (reserviert für Provider-Init) |
| `PaymentWaiting` | Checkout bereit, wartet auf Zahlung |
| `PaymentSucceeded` | Zahlung erfolgreich |
| `PaymentFailed` | Zahlung fehlgeschlagen |
| `PaymentCancelled` | Abgebrochen |
| `PaymentTimeout` | Session abgelaufen |
| `PaymentRefunded` | Rückerstattung |
| `OrderReleased` | PayableResource freigegeben (`ORDER_CONFIRMED`) |

Zusätzlich HookSystem: `onPaymentCompleted`, `onPaymentFailed`, `onPaymentRefunded`

## Checkout

Öffentliches Checkout-Ergebnis (ohne Provider-Informationen):

```typescript
{
  sessionId, checkoutUrl, expiresAt, paymentReference,
  paymentStatus, amount, currency, resourceId, metadata
}
```

API-Routen (Modul aktiviert):
- `GET /methods` – Zahlungsarten (ohne `providerId`)
- `GET /checkout/:sessionId/status`
- `POST /checkout/:sessionId/cancel`
- `POST /checkout/:sessionId/retry`
- `POST /webhooks/:providerId`

## Provider

| Provider | `implemented` | Features |
|----------|---------------|----------|
| Stripe | `true` | Checkout, Webhook, Refund, Cancel, Health |
| PayPal, VR Payment, S-Payment, PAYONE, SumUp | `false` | Platzhalter – identisches Interface |

Alle Provider implementieren `PaymentProvider` mit `supports()`, `verifyWebhookSignature()`, `healthCheck()`.

Konfiguration ausschließlich über `SettingsService` (Namespace `module.payment`). Ausnahme: `APP_ENCRYPTION_KEY`.

## Sicherheitskonzept

| Maßnahme | Implementierung |
|----------|-----------------|
| Webhook-Signaturen | Stripe `constructEvent`, Provider `verifyWebhookSignature()` |
| Replay-Schutz | Prüfung vor Verarbeitung; Speicherung **nach** erfolgreichem Outcome (`payment_events.external_event_id` UNIQUE) |
| Timeouts | `expires_at` auf Session, Prüfung in `getPaymentStatus()` |
| Secrets | Verschlüsselt via Settings Platform, niemals geloggt |
| Providerfehler | `payment_audit` + strukturierte Logs (`PaymentLogger`) |
| Keine Provider-Daten im Frontend | Order-API liefert kein `providerId` |

## Komponenten (`modules/payment/`)

| Komponente | Datei |
|------------|-------|
| `PaymentService` | `services/PaymentServiceImpl.ts` |
| `PaymentManager` | `PaymentManager.ts` |
| `PaymentEventService` | `services/PaymentEventService.ts` |
| `PaymentLogger` | `services/PaymentLogger.ts` |
| `paymentRepository` | `repositories/paymentRepository.ts` |
| `paymentAuditRepository` | `repositories/paymentAuditRepository.ts` |
| `providerMetadata` | `providerMetadata.ts` |
| `types` | `types.ts` (Status, Events, DTOs) |

## Deaktivierungsverhalten

Unverändert: Modul deaktiviert → `isAvailable()` = false → identisches Verhalten wie Barzahlung.

## Implementierungsstatus (Spec 6.1)

| Kriterium | Status |
|-----------|--------|
| Keine Providernamen außerhalb des Moduls | ✅ |
| PaymentService vollständig gekapselt | ✅ |
| Alle Provider identisches Interface | ✅ |
| Webhooks + Replay-Schutz | ✅ |
| EventBus-Events | ✅ |
| Modul-Migrationen | ✅ |
| Unit Tests | ✅ |
| Integration Tests (EventBus) | ✅ |

## Öffentliche Bestellseite (Spec 6.2)

### Smart Payment Selection

Die Bestellseite ruft `GET /api/public/payment/methods` **lazy** auf (erst wenn Gerichte + Pflichtfelder ausgefüllt). Die Logik in `buildPaymentSelection()` entscheidet automatisch:

| Fall | Bedingung | UI |
|------|-----------|-----|
| 1 | Keine Onlinezahlung | Keine Auswahl, Barablauf |
| 2 | Nur Bar (kein Modul/Provider) | Keine Auswahl |
| 3 | Eine Online-Methode, `allowCashOnSite=false` | Auto-Online, kein Selector |
| 4 | Bar + eine Online | Auswahl: „Vor Ort bezahlen“ / „Online bezahlen“ |
| 5 | Bar + mehrere Online | Auswahl mit `(Beschreibung)` zur Unterscheidung |

`recommended` markiert die vorausgewählte Online-Methode (Standard: `defaultProvider`).

### Benutzerführung

1. Gerichte wählen → Daten eingeben → optional Zahlungsart → Bestellen
2. Online: `PaymentDialog` mit Betrag, QR-Code, „Jetzt bezahlen“, Live-Status
3. Erfolg: Abholnummer → Weiterleitung zur Bestellübersicht
4. Fehler/Timeout: „Erneut bezahlen“ oder „Andere Zahlungsart“

### Frontend-Komponenten

| Komponente | Datei |
|------------|-------|
| Smart Selection | `frontend/src/utils/paymentSelection.ts` |
| Zahlungsauswahl | `frontend/src/components/PaymentMethodSelector.tsx` |
| Zahlungsdialog | `frontend/src/components/PaymentDialog.tsx` |
| QR-Code | `frontend/src/components/PaymentQrCode.tsx` |
| Integration | `frontend/src/pages/OrderPage.tsx` |

### Mobile UX & Barrierefreiheit

- Touch-Ziele ≥ 56px (`touch.ts`)
- Große Radio-Auswahl, großer QR-Code, volle Breite Buttons
- `aria-label`, `aria-live="polite"` für Status-Updates
- Keine technischen Begriffe (Stripe, Webhook, Provider) in der UI

### Retry & Timeout

- Status-Polling alle 3s über `GET /public/payment/checkout/:id/status`
- Timeout erkannt serverseitig → `PAYMENT_TIMEOUT` → Retry erzeugt neue Session
- Bestellung bleibt erhalten, nur neue Checkout-Session

### Öffentliche API (Core)

- `GET /api/public/payment/methods`
- `GET /api/public/payment/checkout/:sessionId/status`
- `POST /api/public/payment/checkout/:sessionId/retry`
- `POST /api/public/orders` mit optionalem `paymentMethodId`

## Implementierungsstatus (Spec 6.2)

| Kriterium | Status |
|-----------|--------|
| Keine technischen Providernamen sichtbar | ✅ |
| Zahlungsarten vollständig dynamisch | ✅ |
| Funktioniert ohne Payment-Modul | ✅ |
| Smart Payment Selection | ✅ |
| Keine unnötigen Auswahlfelder | ✅ |
| Mobile + Touch optimiert | ✅ |
| Barrierefrei (ARIA, Kontrast, Live-Region) | ✅ |
| Retry + Timeout | ✅ |

## Mitarbeiterbestellung / Kassenmodus (Spec 6.3)

### Ablauf

1. Mitarbeiter wählt Gerichte → optional Zahlungsart (Bar standardmäßig vorausgewählt)
2. **Barzahlung:** wie bisher → Abholnummer → sofort Küche
3. **Onlinezahlung:** Bestellung mit `skipKitchenNotify` → Vollbild-`PosPaymentDialog` → QR-Code → Live-Status → Erfolg → Auto-Close → nächster Kunde

### Smart Payment (POS)

`buildPosPaymentSelection()` – Barzahlung immer `defaultChoice`, nur bei ausschließlich Online ohne `allowCashOnSite` Auto-Online.

### PosPaymentDialog

- Vollbild, verdeckt Kassen-UI
- Vereinslogo, Veranstaltungsname, Betrag, QR-Code, unterstützte Zahlungsarten
- Live-Status (Polling 2,5s), verbleibende Zeit
- Erfolg: Abholnummer → Auto-Close nach 3,5s
- Fehler: Erneut versuchen / Andere Zahlungsart
- Abbruch: Mitarbeiter schließt → Checkout cancel + Bestellung storniert

### Küche

Bestellungen erscheinen in der Küche, wenn sie **für die Küche freigegeben** sind.

- Vor-Ort-Bestellungen: sofort freigegeben
- Online-Bestellungen: automatisch nach erfolgreicher Zahlung (Payment-Callback) oder manuell aus der Bestellliste

### API (Staff)

- `POST /api/staff/orders/cashier` mit optionalem `paymentMethodId`
- `POST /api/staff/orders/:id/abort-payment` mit `sessionId`
- `POST /api/public/orders/:id/checkout` für Zahlungsart-Wechsel

### Offline

Netzwerkfehler im Dialog → Hinweis, Barzahlung weiter möglich nach Abbruch.

## Implementierungsstatus (Spec 6.3)

| Kriterium | Status |
|-----------|--------|
| Kassenmodus vollständig | ✅ |
| Barzahlung unverändert | ✅ |
| Onlinezahlung + QR + Live-Status | ✅ |
| Automatischer Abschluss | ✅ |
| Keine zusätzlichen Klicks (Bar Default) | ✅ |
| Küche nur bei freigegebenen Bestellungen | ✅ |
| Tablet/Touch/Barrierefrei | ✅ |
| Keine technischen Begriffe | ✅ |

## Implementierungsstatus (Spec 6.4)

| Kriterium | Status |
|-----------|--------|
| Provider automatisch erkannt | ✅ |
| Keine Einstellungen in `.env` | ✅ (nur `APP_ENCRYPTION_KEY` plattformweit) |
| Ausschließlich SettingsService | ✅ |
| Verschlüsselte Speicherung sensibler Felder | ✅ |
| Rollen & Berechtigungen | ✅ |
| Admin-Dashboard mit Karten | ✅ |
| Provider-Verwaltung inkl. Verbindungstest | ✅ |
| Zahlungsarten (Smart Payment) | ✅ |
| Zahlungsübersicht & Detailansicht | ✅ |
| Refunds mit Audit-Log | ✅ |
| Webhooks, Logs, Health | ✅ |
| Statistiken & CSV-Export | ✅ |
| Mobile Admin-Oberfläche | ✅ |

## Administration (Spec 6.4)

Navigation: **Administration → Module → Payment** (`/admin/payment`)

### Unterseiten (Tabs)

| Tab | Berechtigung | Beschreibung |
|-----|--------------|--------------|
| Übersicht | `payment.view` | Dashboard-Karten: Anbieter, Umsatz, offene/fehlgeschlagene Zahlungen, Health |
| Provider | `payment.provider.configure` | Installierte Anbieter, Status, Aktivieren/Deaktivieren, Verbindung testen |
| Zahlungsarten | `payment.manage` | Pro Methode: aktiv, empfohlen, Reihenfolge, Beschreibung |
| Einstellungen | `payment.provider.configure` | API-Schlüssel über SettingsService (maskiert, verschlüsselt) |
| Zahlungen | `payment.view` | Liste, Filter, Detail, CSV-Export |
| Refunds | `payment.refund` | Vollständig/teilweise, Begründung, Audit |
| Logs | `payment.logs` | Checkout, Webhook, Fehler, Retry |
| Webhooks | `payment.webhooks` | Empfangene Ereignisse |
| Health | `payment.view` | API/Webhook/Konfiguration pro Anbieter |
| Statistiken | `payment.statistics` | Heute/Woche/Monat, Erfolgs-/Fehler-/Refundquote, Export |

### Berechtigungen

| Key | Beschreibung |
|-----|--------------|
| `payment.view` | Dashboard und Zahlungsliste |
| `payment.manage` | Zahlungsarten konfigurieren |
| `payment.refund` | Rückerstattungen |
| `payment.logs` | Protokolle |
| `payment.statistics` | Statistiken und Export |
| `payment.provider.configure` | Anbieter-Einstellungen |
| `payment.webhooks` | Webhook-Ereignisse |

### Admin-API

Basis: `/api/modules/features/payment/admin`

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/dashboard` | GET | Dashboard-Daten |
| `/providers` | GET | Alle Anbieter |
| `/providers/:id/enabled` | PUT | Anbieter aktivieren/deaktivieren |
| `/providers/:id/test` | POST | Verbindungstest |
| `/method-types` | GET/PUT | Zahlungsarten-Konfiguration |
| `/payments` | GET | Zahlungsliste (Paging) |
| `/payments/:id` | GET | Detail inkl. Historie |
| `/payments-export.csv` | GET | CSV-Export |
| `/refunds` | GET/POST | Refund-Liste / neue Rückerstattung |
| `/logs` | GET | Audit-Logs |
| `/webhooks` | GET | Webhook-Ereignisse |
| `/health` | GET | Health pro Anbieter |
| `/statistics` | GET | Statistiken (`?period=today\|week\|month`) |
| `/statistics-export.csv` | GET | Statistik-Export |

### Sicherheitskonzept

- API-Schlüssel werden **niemals im Klartext** zurückgegeben (SettingsService maskiert Passwort-Felder)
- Speicherung verschlüsselt über `SettingsEncryption`
- Aktionen werden im **Audit-Log** protokolliert (Provider aktiviert, Refund, Einstellungen geändert)
- Endpunkte durch Permission-Middleware geschützt

### Smart Payment (Zahlungsarten)

Administratoren aktivieren **Zahlungsarten**, nicht Provider direkt. Konfiguration in `methodTypes` (SettingsService):

```json
{
  "stripe:card": { "enabled": true, "recommended": true, "sortOrder": 10 },
  "stripe:apple_pay": { "enabled": true, "sortOrder": 20 }
}
```

`PaymentManager.getAvailablePaymentMethods()` erzeugt daraus die öffentliche Anzeige.

## Release Validation (Spec 6.5)

Implementierungsdetails: [ADR-007](./007-payment-module.md) (dieses Dokument).

**Empfehlung: Produktionsreif (Stripe-Einsatz)**

### Behobene kritische Punkte (6.5)

- Admin-Refund nur mit `payment.refund`
- Granulare Berechtigungen pro Admin-Endpunkt
- Webhook-Idempotenz erst nach erfolgreicher Verarbeitung
- Stripe: Freigabe nur bei `payment_status=paid`
- QR-Code lokal (Paket `qrcode`, kein externer Dienst)
- Polling-Leak nach Retry behoben
- Checkout-Fehler wenn URL fehlt

### Implementierungsstatus (Spec 6.5)

| Kriterium | Status |
|-----------|--------|
| Architektur ADR-konform | ✅ |
| Keine Regression | ✅ |
| Security Review | ✅ |
| Performance Review | ✅ |
| UX Review | ✅ |
| Tests erweitert | ✅ |
| Dokumentation | ✅ |

## Offene Punkte

- [ ] PayPal und weitere Provider implementieren
- [ ] `IN_KITCHEN` / `READY` / `COLLECTED` im Payment-Status bei Order-Updates synchronisieren
- [x] QR-Code lokal generieren (Spec 6.5 – `qrcode` npm)
- [ ] Refund-Flow mit automatischem DB-Transaktionslookup aus Zahlungsdetail
- [ ] Excel/PDF-Export serverseitig (aktuell CSV + Browser-Druck für PDF)
- [ ] Playwright E2E-Tests für Payment-Flows
