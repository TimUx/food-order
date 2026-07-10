# Performance Guide — FestManager Platform 2.0

Leitfaden für Performance, Lasttests und Skalierung (Phase 9).

## Zielwerte

| Metrik | Ziel |
|--------|------|
| Gleichzeitige Bestellungen | ≥ 100 |
| Gleichzeitige Benutzer | ≥ 250 |
| WebSocket-Verbindungen | ≥ 500 (Architektur vorbereitet) |
| API p95 | < 2000 ms |
| Fehlerrate (Load Test) | < 5 % |

## Benchmarks ausführen

### API-Baseline (Ist-Werte)

```bash
# Stack muss laufen
npm run qa:performance
```

Ergebnis: `artifacts/performance.json` mit Vorher/Nachher-Vergleich.

Gemessene Endpunkte:
- `/api/health` (inkl. DB-Latenz)
- `/api/public/menu`, `/club`, `/event`
- `/api/realtime/pickup-board` (kalt + ETag)

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
| `login_burst` | 20 | 30s | Login |
| `mixed_users` | 250 | 2m | Gemischte Last |

## Datenbank-Optimierungen

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
  "performance": { "topEndpoints": [...] }
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
