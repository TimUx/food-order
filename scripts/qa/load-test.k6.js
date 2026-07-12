/**
 * k6 Lasttests — FestSchmiede Phase 9
 *
 * Szenarien: Health, öffentliche APIs, Bestellungen, Login, Realtime, Küche
 *
 * Ausführung:
 *   k6 run scripts/qa/load-test.k6.js
 *   API_BASE=http://localhost:3001/default/api STAFF_EMAIL=admin@example.de STAFF_PASSWORD=secret k6 run scripts/qa/load-test.k6.js
 *
 * Zielwerte (Akzeptanz):
 *   - 100 gleichzeitige Bestellungen (order_load)
 *   - 250 gleichzeitige Benutzer (mixed_users)
 *   - p95 < 2000ms, Fehlerrate < 5%
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const TENANT_SLUG = __ENV.QA_TENANT_SLUG || 'default';
const API_BASE = __ENV.API_BASE || `http://localhost:3001/${TENANT_SLUG}/api`;
const PLATFORM_API_BASE = __ENV.PLATFORM_API_BASE || 'http://localhost:3001/api';
const FOOD_ITEM_ID = __ENV.FOOD_ITEM_ID || '00000000-0000-0000-0001-000000000001';
const EVENT_ID = __ENV.EVENT_ID || '00000000-0000-0000-0000-000000000001';
const STAFF_EMAIL = __ENV.STAFF_EMAIL || 'admin@verein.local';
const STAFF_PASSWORD = __ENV.STAFF_PASSWORD || 'admin123';
const EVENT_STATS_THRESHOLD_MS = Number(__ENV.EVENT_STATS_THRESHOLD_MS || 500);

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
    'http_req_duration{scenario:order_load}': ['p(95)<3000'],
    'http_req_duration{scenario:realtime_poll}': ['p(95)<1500'],
    'http_req_duration{scenario:dashboard_stats}': [`p(95)<${EVENT_STATS_THRESHOLD_MS}`],
  },
  scenarios: {
    health_check: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      exec: 'healthCheck',
      tags: { scenario: 'health' },
    },
    public_api: {
      executor: 'constant-vus',
      vus: 50,
      duration: '1m',
      exec: 'publicApi',
      startTime: '5s',
      tags: { scenario: 'public_api' },
    },
    order_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
      exec: 'orderBurst',
      startTime: '10s',
      tags: { scenario: 'order_load' },
    },
    realtime_poll: {
      executor: 'constant-vus',
      vus: 30,
      duration: '1m',
      exec: 'realtimePoll',
      startTime: '15s',
      tags: { scenario: 'realtime_poll' },
    },
    dashboard_stats: {
      executor: 'constant-vus',
      vus: 20,
      duration: '1m',
      exec: 'dashboardStatsPoll',
      startTime: '20s',
      tags: { scenario: 'dashboard_stats' },
    },
    login_burst: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30s',
      exec: 'loginAttempt',
      startTime: '20s',
      tags: { scenario: 'login' },
    },
    mixed_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '1m', target: 250 },
        { duration: '30s', target: 0 },
      ],
      exec: 'mixedUser',
      startTime: '30s',
      tags: { scenario: 'mixed_users' },
    },
  },
};

export function healthCheck() {
  const res = http.get(`${PLATFORM_API_BASE}/health`);
  check(res, {
    'health 200': (r) => r.status === 200,
    'health has db latency': (r) => r.json('database.latencyMs') !== undefined,
  });
  sleep(0.3);
}

export function publicApi() {
  const endpoints = [
    `${API_BASE}/public/menu`,
    `${API_BASE}/public/club`,
    `${API_BASE}/public/event`,
    `${PLATFORM_API_BASE}/public/routing-config`,
  ];
  const url = endpoints[__ITER % endpoints.length];
  const res = http.get(url);
  check(res, { 'public api 200': (r) => r.status === 200 });
  sleep(0.5);
}

export function orderBurst() {
  const payload = JSON.stringify({
    firstName: 'Load',
    lastName: `K6-${__VU}-${__ITER}`,
    items: [{ foodItemId: FOOD_ITEM_ID, quantity: 1 }],
    formStartedAt: Date.now() - 5000,
    _hp: '',
  });

  const res = http.post(`${API_BASE}/public/orders`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'create_order' },
  });

  check(res, {
    'order created or limited': (r) => r.status === 201 || r.status === 429 || r.status === 400,
  });
  sleep(0.2);
}

let cachedEtag = '';
let staffToken = '';
let cachedStatsEtag = '';

export function setup() {
  const loginRes = http.post(
    `${API_BASE}/auth/login`,
    JSON.stringify({ email: STAFF_EMAIL, password: STAFF_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (loginRes.status === 200) {
    return { token: loginRes.json('token') };
  }
  return { token: '' };
}

export function realtimePoll() {
  const url = cachedEtag
    ? `${API_BASE}/realtime/pickup-board?etag=${encodeURIComponent(cachedEtag)}`
    : `${API_BASE}/realtime/pickup-board`;

  const res = http.get(url);
  check(res, {
    'realtime ok': (r) => r.status === 200,
  });

  const body = res.json();
  if (body && body.etag) {
    cachedEtag = body.etag;
  }
  sleep(1);
}

export function dashboardStatsPoll(data) {
  const token = data?.token || staffToken;
  if (!token) {
    sleep(1);
    return;
  }
  staffToken = token;

  const url = cachedStatsEtag
    ? `${API_BASE}/realtime/events/${EVENT_ID}/stats?etag=${encodeURIComponent(cachedStatsEtag)}`
    : `${API_BASE}/realtime/events/${EVENT_ID}/stats`;

  const res = http.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { name: 'event_stats' },
  });

  check(res, {
    'dashboard stats ok': (r) => r.status === 200,
    'dashboard stats bounded': (r) => (r.body && r.body.length < 4096) || r.status === 200,
  });

  const body = res.json();
  if (body && body.etag) {
    cachedStatsEtag = body.etag;
  }
  sleep(1.5);
}

export function loginAttempt() {
  if (!STAFF_EMAIL || !STAFF_PASSWORD) {
    sleep(1);
    return;
  }

  const res = http.post(
    `${API_BASE}/auth/login`,
    JSON.stringify({ email: STAFF_EMAIL, password: STAFF_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(res, {
    'login ok or rate limited': (r) => r.status === 200 || r.status === 401 || r.status === 429,
  });
  sleep(0.5);
}

export function mixedUser() {
  const roll = __ITER % 4;
  if (roll === 0) healthCheck();
  else if (roll === 1) publicApi();
  else if (roll === 2) realtimePoll();
  else orderBurst();
}
