/**
 * k6 Lasttest — Grundszenarien für FestManager (K6)
 *
 * Voraussetzungen:
 *   - Stack läuft (docker compose up)
 *   - QA-Seed ausgeführt (Speisekarte vorhanden)
 *   - TURNSTILE_SECRET_KEY NICHT gesetzt (sonst schlägt order_burst fehl)
 *
 * Ausführung:
 *   k6 run scripts/qa/load-test.k6.js
 *   API_BASE=http://localhost:3001/api FOOD_ITEM_ID=<uuid> k6 run scripts/qa/load-test.k6.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const API_BASE = __ENV.API_BASE || 'http://localhost:3001/api';
const FOOD_ITEM_ID =
  __ENV.FOOD_ITEM_ID || '00000000-0000-0000-0001-000000000001';

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
  scenarios: {
    health_check: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'healthCheck',
    },
    public_menu: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1m',
      exec: 'publicMenu',
      startTime: '5s',
    },
    order_burst: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 15 },
        { duration: '40s', target: 15 },
        { duration: '10s', target: 0 },
      ],
      exec: 'orderBurst',
      startTime: '10s',
    },
  },
};

export function healthCheck() {
  const res = http.get(`${API_BASE}/health`);
  check(res, {
    'health status 200': (r) => r.status === 200,
    'health body ok': (r) => r.json('status') === 'ok',
  });
  sleep(0.5);
}

export function publicMenu() {
  const res = http.get(`${API_BASE}/public/menu`);
  check(res, {
    'menu status 200': (r) => r.status === 200,
    'menu has items': (r) => {
      const body = r.json();
      return body && (Array.isArray(body.items) || Array.isArray(body.foodItems));
    },
  });
  sleep(1);
}

export function orderBurst() {
  const payload = JSON.stringify({
    firstName: 'Load',
    lastName: `Test${__VU}-${__ITER}`,
    items: [{ foodItemId: FOOD_ITEM_ID, quantity: 1 }],
    formStartedAt: Date.now() - 5000,
    _hp: '',
  });

  const res = http.post(`${API_BASE}/public/orders`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'order created or rate limited': (r) => r.status === 201 || r.status === 429,
  });
  sleep(0.3);
}
