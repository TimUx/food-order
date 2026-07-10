/**
 * In-Memory Performance-Metriken (Phase 9).
 * Vorbereitung für Prometheus/OpenTelemetry-Export.
 */

type LatencyBucket = { count: number; totalMs: number; maxMs: number };

const apiLatencies = new Map<string, LatencyBucket>();
const slowApiThresholdMs = Number(process.env.SLOW_API_MS ?? 500);
const slowDbThresholdMs = Number(process.env.SLOW_DB_MS ?? 200);

let socketConnections = 0;
let socketPeakConnections = 0;

export const performanceMetrics = {
  recordApi(path: string, durationMs: number): void {
    const key = path.replace(/\/[0-9a-f-]{36}/gi, '/:id').replace(/\/\d+/g, '/:n');
    const bucket = apiLatencies.get(key) ?? { count: 0, totalMs: 0, maxMs: 0 };
    bucket.count += 1;
    bucket.totalMs += durationMs;
    bucket.maxMs = Math.max(bucket.maxMs, durationMs);
    apiLatencies.set(key, bucket);
  },

  isSlowApi(durationMs: number): boolean {
    return durationMs >= slowApiThresholdMs;
  },

  isSlowDb(durationMs: number): boolean {
    return durationMs >= slowDbThresholdMs;
  },

  recordSocketConnect(): void {
    socketConnections += 1;
    socketPeakConnections = Math.max(socketPeakConnections, socketConnections);
  },

  recordSocketDisconnect(): void {
    socketConnections = Math.max(0, socketConnections - 1);
  },

  getSocketStats(): { active: number; peak: number } {
    return { active: socketConnections, peak: socketPeakConnections };
  },

  getApiSummary(limit = 20): Array<{ path: string; count: number; avgMs: number; maxMs: number }> {
    return [...apiLatencies.entries()]
      .map(([path, b]) => ({
        path,
        count: b.count,
        avgMs: b.count ? Math.round(b.totalMs / b.count) : 0,
        maxMs: b.maxMs,
      }))
      .sort((a, b) => b.avgMs - a.avgMs)
      .slice(0, limit);
  },

  reset(): void {
    apiLatencies.clear();
    socketConnections = 0;
    socketPeakConnections = 0;
  },
};
