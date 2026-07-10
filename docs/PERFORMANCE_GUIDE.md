# Performance Guide — FestSchmiede Platform 2.0

Leitfaden für Performance, Lasttests und Skalierung (Phase 9).

## Zielwerte

| Metrik | Ziel |
|--------|------|
| Gleichzeitige Bestellungen | ≥ 100 |
| Gleichzeitige Benutzer | ≥ 250 |
| WebSocket-Verbindungen | ≥ 500 (Architektur vorbereitet) |
| API p95 | < 2000 ms |
| **Event-Dashboard Stats (1000 Orders)** | **< 500 ms** (`EVENT_STATS_THRESHOLD_MS`) |
| Fehlerrate (Load Test) | < 5 % |

### Eventtag-Dashboard (1000 Bestellungen)

| Metrik | Vorher (geschätzt) | Nachher (Ziel) |
|--------|-------------------|----------------|
| `getStats` DB-Queries | 1× `findMany` + alle Items/Orders | 4 Aggregationen + max. 1 FoodItem-Lookup |
| Payload Stats-Response | wächst mit Order×Items | **bounded** (~2 KB) |
| Realtime Stats Poll p95 | ungemessen | **< 500 ms** |
| `_createOrder` FoodItems | N Queries (`findById`) | **1** Batch (`findByIds`) |

Akzeptanz: Nach QA-Seed mit ≥1000 Bestellungen bleibt `/api/realtime/events/:id/stats` unter `EVENT_STATS_THRESHOLD_MS` (Default 500ms).

## Benchmarks ausführen

### API-Baseline (Ist-Werte)

```bash
# Stack muss laufen; optional 1000 Orders seeden:
cd backend && npx tsx ../scripts/qa/seed-performance-orders.ts 1000

npm run qa:performance
# Schwellenwert anpassen: EVENT_STATS_THRESHOLD_MS=500
```

Ergebnis: `artifacts/performance.json` mit Vorher/Nachher-Vergleich.

Gemessene Endpunkte:
- `/api/health` (inkl. DB-Latenz, Realtime-Polling-Metriken)
- `/api/public/menu`, `/club`, `/event`
- `/api/realtime/pickup-board` (kalt + ETag)
- `/api/realtime/events/:eventId/stats` (kalt + ETag, Schwellenwert `EVENT_STATS_THRESHOLD_MS`)

### k6 Lasttests

```bash
# Voraussetzung: k6 installiert, QA-Seed ausgeführt
npm run qa:load

# Mit Staff-Login (optional)
API_BASE=http://localhost:3001/api \
STAFF_EMAIL=admin@example.de \
STAFF_PASSWORD=secret \
k6 run scripts/qa/load-test.k6.js
```

Szenarien:
| Szenario | VUs | Dauer | Prüft |
|----------|-----|-------|-------|
| `health_check` | 10 | 30s | Health + DB |
| `public_api` | 50 | 1m | Öffentliche APIs |
| `order_load` | 100 | 2m | Bestellungen |
| `realtime_poll` | 30 | 1m | Küche/Abholmonitor Polling |
| `dashboard_stats` | 20 | 1m | Event-Dashboard Stats (p95 < 500ms) |
| `login_burst` | 20 | 30s | Login |
| `mixed_users` | 250 | 2m | Gemischte Last |

## Datenbank-Optimierungen

### Order-Dashboard-Aggregationen (`orderStats.ts`)

Statt alle Bestellungen inkl. Positionen zu laden:

1. `groupBy status` — Zähler pro Status
2. `aggregate _sum totalPrice` — Umsatz
3. `orderItem.groupBy` — Top-5 Gerichte (LIMIT 5)
4. `AVG(ready_at - created_at)` — SQL-Aggregat für Küchenzeit

Bounded Response unabhängig von der Order-Anzahl.

Migration `migratePerformanceSchema` (idempotent):

| Index | Zweck |
|-------|-------|
| `orders(tenant_id, event_id, status)` | Kitchen/Staff-Filter |
| `orders(tenant_id, updated_at DESC)` | Realtime ETag-Aggregate |
| `orders(event_id, status, ready_at) WHERE READY` | Abholmonitor |
| `order_items(order_id)` | Order-Joins |
| `orders(tenant_id, lookup_token)` | Status-Lookup |

Kritische Abfragen mit `EXPLAIN ANALYZE` prüfen:

```sql
EXPLAIN ANALYZE
SELECT max(updated_at), count(*)
FROM orders
WHERE tenant_id = '...' AND event_id = '...';
```

## Realtime & WebSocket-Fallback

```
WebSocket (primär)
    ↓ Ausfall
Adaptives Polling (1.5s → 45s)
    ↓ WS wieder verfügbar (15s Probe)
Automatischer Rückwechsel
```

Frontend: `RealtimeService.ts` + `PollingScheduler.ts`  
Backend: ETag-Delta-Sync in `realtimeSyncService.ts`

Polling-Intervalle:
| Aktivität | Intervall |
|-----------|-----------|
| high | 1.5 s |
| normal | 4 s |
| low | 7.5 s |
| idle | 45 s |

## Caching

| Schicht | Implementierung |
|---------|-----------------|
| Settings | `SettingsCache` (30s TTL, tenant-prefixed) |
| Tenant Resolver | 60s positive / 30s negative cache |
| Shared Cache | `SharedCache` Interface (In-Memory; Redis vorbereitet) |
| Frontend PWA | NetworkFirst für `/api/public/*` |
| Uploads | `Cache-Control: public, max-age=86400` |

## Frontend

- Route-Level Code Splitting (`TenantRoutes.tsx` — Staff/Admin lazy)
- Vite `manualChunks`: vendor, mui, socket
- Öffentliche Bestellseite eager (schneller First Paint)

## Monitoring

### Health (`GET /api/health`)

```json
{
  "database": { "ok": true, "latencyMs": 3 },
  "websockets": { "active": 12, "peak": 45 },
  "performance": {
    "topEndpoints": [...],
    "realtimePolling": [
      { "endpoint": "event-stats", "polls": 120, "unchangedRate": 85, "avgMs": 42 }
    ]
  }
}
```

### Performance Logging

- Langsame APIs: `slow_api_request` (Schwelle: `SLOW_API_MS`, default 500ms)
- Request-Log: `duration_ms` pro Request

### Plattform-Monitoring

`/api/platform/monitoring` — CPU, RAM, DB-Latenz, Socket-Stats, Top-Slow-Endpoints

## Skalierung (Zukunft)

```
                    Load Balancer (Traefik)
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         Backend 1    Backend 2    Backend N
              │            │            │
              └────────────┼────────────┘
                           │
                    Redis (geplant)
              ┌────────────┼────────────┐
              │            │            │
         Socket.IO      Rate Limit    Shared Cache
         Adapter         Store
                           │
                      PostgreSQL
```

Vorbereitet, nicht vollständig implementiert:
- `REDIS_URL` + `SharedCache` Redis-Adapter
- Socket.IO Redis Adapter (`@socket.io/redis-adapter`)
- Sticky Sessions am Load Balancer

## Verwandte Dokumentation

- [ADR-030](./architecture/030-performance-scalability.md)
- [ADR-013](./architecture/013-realtime-communication.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [PHASE_9_COMPLETION_REPORT](./architecture/PHASE_9_COMPLETION_REPORT.md)
