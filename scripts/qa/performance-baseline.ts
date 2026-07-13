/**
 * Erweiterte Performance-Baseline (Phase 9).
 * Misst Ist-Werte vor/nach Optimierungen.
 */
import fs from 'fs';
import path from 'path';

const artifactsDir = path.resolve(__dirname, '../../artifacts');
const tenantSlug = process.env.QA_TENANT_SLUG || 'default';
const apiBase = process.env.QA_API_BASE || `http://localhost:3001/${tenantSlug}/api`;
const platformApiBase = process.env.QA_PLATFORM_API_BASE || 'http://localhost:3001/api';
const tenantHost = process.env.QA_TENANT_HOST || 'localhost';
const eventId = process.env.QA_EVENT_ID || '00000000-0000-0000-0000-000000000001';
const staffEmail = process.env.STAFF_EMAIL || 'admin@verein.local';
const staffPassword = process.env.STAFF_PASSWORD || 'admin123';
const statsThresholdMs = Number(process.env.EVENT_STATS_THRESHOLD_MS ?? 500);

interface MeasureResult {
  ms: number;
  status: number;
  bytes?: number;
}

function tenantHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    Host: tenantHost,
    'X-Forwarded-Host': tenantHost,
    ...extra,
  };
}

async function measure(label: string, url: string, init?: RequestInit): Promise<MeasureResult> {
  const start = performance.now();
  const res = await fetch(url, init);
  const buf = await res.arrayBuffer();
  const ms = Math.round(performance.now() - start);
  if (!res.ok && res.status !== 304) {
    throw new Error(`${label} failed: ${res.status}`);
  }
  return { ms, status: res.status, bytes: buf.byteLength };
}

async function loginStaff(): Promise<string> {
  const res = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: tenantHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email: staffEmail, password: staffPassword }),
  });
  if (!res.ok) throw new Error(`staff login failed: ${res.status}`);
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error('staff login missing token');
  return body.token;
}

async function main(): Promise<void> {
  const results: Record<string, number | string | boolean> = {
    measuredAt: new Date().toISOString(),
    eventStatsThresholdMs: statsThresholdMs,
  };

  const health = await measure('health', `${platformApiBase}/health`);
  results.healthMs = health.ms;

  const menu = await measure('menu', `${apiBase}/public/menu?eventId=${encodeURIComponent(eventId)}`, { headers: tenantHeaders() });
  results.publicMenuMs = menu.ms;
  results.publicMenuBytes = menu.bytes ?? 0;

  const club = await measure('club', `${apiBase}/public/club`, { headers: tenantHeaders() });
  results.publicClubMs = club.ms;

  const event = await measure('event', `${apiBase}/public/event`, { headers: tenantHeaders() });
  results.publicEventMs = event.ms;

  const routing = await measure('routing', `${platformApiBase}/public/routing-config`);
  results.routingConfigMs = routing.ms;

  const realtime1 = await measure('realtime-pickup', `${apiBase}/realtime/pickup-board`, {
    headers: tenantHeaders(),
  });
  results.realtimePickupColdMs = realtime1.ms;
  const etagRes = await fetch(`${apiBase}/realtime/pickup-board`, { headers: tenantHeaders() });
  const etag = etagRes.headers.get('etag') ?? '';
  if (etag) {
    const realtime2 = await measure(
      'realtime-pickup-etag',
      `${apiBase}/realtime/pickup-board?etag=${encodeURIComponent(etag)}`,
      { headers: tenantHeaders() }
    );
    results.realtimePickupEtagMs = realtime2.ms;
  }

  try {
    const token = await loginStaff();
    const authHeaders = tenantHeaders({ Authorization: `Bearer ${token}` });

    const statsCold = await measure(
      'event-stats-cold',
      `${apiBase}/realtime/events/${eventId}/stats`,
      { headers: authHeaders }
    );
    results.eventStatsColdMs = statsCold.ms;
    results.eventStatsBytes = statsCold.bytes ?? 0;
    results.eventStatsWithinThreshold = statsCold.ms <= statsThresholdMs;

    const statsBody = await fetch(`${apiBase}/realtime/events/${eventId}/stats`, {
      headers: authHeaders,
    }).then((r) => r.json()) as { etag?: string };
    if (statsBody.etag) {
      const statsEtag = await measure(
        'event-stats-etag',
        `${apiBase}/realtime/events/${eventId}/stats?etag=${encodeURIComponent(statsBody.etag)}`,
        { headers: authHeaders }
      );
      results.eventStatsEtagMs = statsEtag.ms;
    }
  } catch (err) {
    results.eventStatsSkipped = String(err);
  }

  const mem = process.memoryUsage();
  results.heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
  results.rssMb = Math.round(mem.rss / 1024 / 1024);

  fs.mkdirSync(artifactsDir, { recursive: true });
  const jsonPath = path.join(artifactsDir, 'performance.json');
  const prior = fs.existsSync(jsonPath)
    ? (JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as Record<string, unknown>)
    : null;

  const output = { current: results, prior };
  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));

  const lines = Object.entries(results).map(([k, v]) => `- ${k}: ${v}`);
  if (prior && typeof prior === 'object' && 'current' in prior) {
    const prev = prior.current as Record<string, number>;
    lines.push('', '## Vergleich (vorher → nachher)');
    for (const key of [
      'healthMs',
      'publicMenuMs',
      'realtimePickupColdMs',
      'realtimePickupEtagMs',
      'eventStatsColdMs',
      'eventStatsEtagMs',
    ]) {
      const before = prev[key];
      const after = results[key];
      if (typeof before === 'number' && typeof after === 'number') {
        const delta = after - before;
        const sign = delta > 0 ? '+' : '';
        lines.push(`- ${key}: ${before}ms → ${after}ms (${sign}${delta}ms)`);
      }
    }
  }

  fs.writeFileSync(
    path.join(artifactsDir, 'performance-report.md'),
    `# Performance Report\n\n${lines.join('\n')}\n`
  );
  console.log(results);

  if (results.eventStatsWithinThreshold === false) {
    console.warn(
      `WARN: event stats ${results.eventStatsColdMs}ms exceeds threshold ${statsThresholdMs}ms`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
