# ADR-030: Performance & Skalierung (Phase 9)

| Feld | Wert |
|------|------|
| **Status** | Accepted (Phase 9) |
| **Datum** | 2026-07-09 |

## Ziel

Produktionsreife Performance für Multi-Tenant-Betrieb. Messbare Optimierungen, reproduzierbare Lasttests, Skalierungsvorbereitung.

## Datenbank

Indizes auf Basis analysierter Hot Paths (Realtime-Aggregate, Kitchen-Filter, Pickup-Board):

- `orders_tenant_event_status_idx`
- `orders_tenant_updated_at_idx`
- `orders_event_status_ready_at_idx` (partial)
- `order_items_order_id_idx`

## API & Monitoring

- `performanceMetrics` — In-Memory Latenz-Tracking
- Erweiterter `/api/health` mit DB-Latenz und Socket-Stats
- `slow_api_request` Logging ab 500ms

## Realtime

Bestehende Architektur (ADR-013) bestätigt:
- WebSocket primär, adaptives Polling als Fallback
- ETag-Delta-Sync minimiert Payload

## Frontend

- Lazy Loading für Staff/Admin-Routen
- Vite vendor/mui/socket Chunks

## Lasttests

k6-Skript `scripts/qa/load-test.k6.js` mit Szenarien für 100 Bestellungen / 250 Benutzer.

## Skalierung (vorbereitet)

| Komponente | Phase 9 | Zukünftig |
|------------|---------|-----------|
| Shared Cache | Interface + In-Memory | Redis (`ioredis`) |
| Socket.IO | Single-Node | Redis Adapter |
| Rate Limits | In-Memory | Redis Store |
| Load Balancer | Traefik (Phase 6) | Sticky Sessions |

## Docker

Resource Limits in `docker-compose.yml` (Postgres 1G, Backend 512M, Frontend 256M).

## Offene Punkte

- [ ] Prometheus `/metrics` Endpoint
- [ ] Redis SharedCache vollständig
- [ ] Socket.IO Redis Adapter
- [ ] Bundle-Size CI Budget
