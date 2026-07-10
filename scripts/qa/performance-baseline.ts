/**
 * Erweiterte Performance-Baseline (Phase 9).
 * Misst Ist-Werte vor/nach Optimierungen.
 */
import fs from 'fs';
import path from 'path';

const artifactsDir = path.resolve(__dirname, '../../artifacts');
const apiBase = process.env.QA_API_BASE || 'http://localhost:3001/api';

interface MeasureResult {
  ms: number;
  status: number;
  bytes?: number;
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

async function main(): Promise<void> {
  const results: Record<string, number | string> = {
    measuredAt: new Date().toISOString(),
  };

  const health = await measure('health', `${apiBase}/health`);
  results.healthMs = health.ms;

  const menu = await measure('menu', `${apiBase}/public/menu`);
  results.publicMenuMs = menu.ms;
  results.publicMenuBytes = menu.bytes ?? 0;

  const club = await measure('club', `${apiBase}/public/club`);
  results.publicClubMs = club.ms;

  const event = await measure('event', `${apiBase}/public/event`);
  results.publicEventMs = event.ms;

  const routing = await measure('routing', `${apiBase}/public/routing-config`);
  results.routingConfigMs = routing.ms;

  // Realtime sync (cold + etag)
  const realtime1 = await measure('realtime-pickup', `${apiBase}/realtime/pickup-board`);
  results.realtimePickupColdMs = realtime1.ms;
  const etagRes = await fetch(`${apiBase}/realtime/pickup-board`);
  const etag = etagRes.headers.get('etag') ?? '';
  if (etag) {
    const realtime2 = await measure(
      'realtime-pickup-etag',
      `${apiBase}/realtime/pickup-board?etag=${encodeURIComponent(etag)}`
    );
    results.realtimePickupEtagMs = realtime2.ms;
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
    for (const key of ['healthMs', 'publicMenuMs', 'realtimePickupColdMs', 'realtimePickupEtagMs']) {
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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
