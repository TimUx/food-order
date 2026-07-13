# ADR-013: Realtime Communication Platform

| Feld | Wert |
|------|------|
| **Status** | Accepted (implementiert) |
| **Datum** | 2026-07-09 |

## Ziel

Echtzeitaktualisierungen (Küche, Abholmonitor, Dashboard, Zahlungsstatus) müssen auch bei instabilem WLAN, WebSocket-Ausfall oder Container-Neustart zuverlässig funktionieren — ohne Benutzerinteraktion und ohne Seiten-Reload.

## Architekturentscheidung

### Zentrale Schnittstelle: `RealtimeService`

```
Komponenten / Pages
        ↓
RealtimeService (frontend/src/services/realtime/)
        ↓
┌───────────────────┬────────────────────┐
│ socketTransport   │  HTTP Sync API     │
│ (Socket.IO intern)│  /api/realtime/*   │
└───────────────────┴────────────────────┘
```

**Regel:** Frontend-Komponenten importieren **niemals** `socket.io-client` direkt.

### Verbindungszustände

| Zustand | Bedeutung |
|---------|-----------|
| `CONNECTING` | Erstverbindung läuft |
| `CONNECTED` | WebSocket aktiv |
| `DEGRADED` | WebSocket verbunden, Polling-Fehler |
| `POLLING` | HTTP-Polling als primärer Transport |
| `RECONNECTING` | WebSocket-Wiederherstellung läuft |
| `DISCONNECTED` | Browser offline / keine Verbindung |

### Fallback-Verhalten

1. Start → WebSocket verbinden
2. Bei Erfolg → Ereignisse über WS, Delta-Poll nur bei WS-Events oder Initial-Load
3. Bei WS-Ausfall → automatisch intelligentes Polling
4. Während Polling → alle 15s WebSocket-Probe
5. WS wieder verfügbar → automatisch zurück, Polling stoppt

### Intelligentes Polling

Intervalle zentral im `PollingScheduler`:

| Aktivität | Intervall |
|-----------|-----------|
| Hoch (Küche, Zahlung) | 1,5s |
| Normal (Dashboard) | 4s |
| Niedrig | 7,5s |
| Keine Veranstaltung / Club | 45s |

- Nach Datenänderung → 30s Boost auf hohes Intervall
- 60s ohne Änderung → schrittweise Verlangsamung

### Delta-Sync (Backend)

`GET /api/realtime/*` mit `?etag=` — Antwort `{ changed, etag, serverTime, data? }`.

Keine vollständigen Datenübertragungen wenn sich nichts geändert hat.

| Endpoint | Zweck |
|----------|--------|
| `/realtime/events/:id/orders` | Küche, Bestellliste |
| `/realtime/events/:id/stats` | Dashboard |
| `/realtime/pickup-board?eventId=` | Abholmonitor (pro Veranstaltung) |
| `/realtime/orders/:token` | Kunden-Bestellstatus |
| `/realtime/payment/:sessionId` | Zahlungsdialog |
| `/realtime/club` | Vereins-Branding |

### Kanal-Helfer (`channels.ts`)

Vorgefertigte Subscriptions: `subscribeEventOrders`, `subscribeEventStats`, `subscribePickupBoard`, `subscribeOrderStatus`, `subscribePaymentStatus`, `subscribeClubUpdates`, `subscribePrintJobs`.

### UX

- Keine störenden Dialoge
- StaffLayout: dezente Banner bei Polling/Offline
- Admin-Dashboard: optionales `RealtimeStatusPanel` (Transport, Intervall, Reconnects)

### Logging (DEV)

`[Realtime]` — WebSocket verbunden/getrennt, Polling gestartet/beendet, Intervallwechsel, Reconnect.

## Auswirkungen

- `frontend/src/services/socket.ts` entfernt
- Pickup-Board erhält WS-Events (`pickup:{eventId}` Room in `emitOrderUpdate`)
- Payment-Dialoge nutzen RealtimeService statt `setInterval`

## Tests

- `pollingScheduler.test.ts` — Intervall-Logik
- `realtimeSyncService.test.ts` — ETag-Stabilität

## Offene Punkte

- [ ] Server-Sent Events als zusätzlicher Transport evaluieren
- [ ] Metriken (Prometheus) für Reconnect-Rate
- [ ] E2E-Test mit absichtlich blockiertem WebSocket
