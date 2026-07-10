import { describe, it, expect, beforeEach } from 'vitest';
import { performanceMetrics } from './performanceMetrics';

describe('performanceMetrics', () => {
  beforeEach(() => {
    performanceMetrics.reset();
  });

  it('tracks API latencies', () => {
    performanceMetrics.recordApi('/api/public/menu', 120);
    performanceMetrics.recordApi('/api/public/menu', 80);
    const summary = performanceMetrics.getApiSummary();
    expect(summary[0]?.path).toBe('/api/public/menu');
    expect(summary[0]?.avgMs).toBe(100);
    expect(summary[0]?.count).toBe(2);
  });

  it('tracks socket connections', () => {
    performanceMetrics.recordSocketConnect();
    performanceMetrics.recordSocketConnect();
    performanceMetrics.recordSocketDisconnect();
    expect(performanceMetrics.getSocketStats()).toEqual({ active: 1, peak: 2 });
  });

  it('flags slow requests', () => {
    expect(performanceMetrics.isSlowApi(600)).toBe(true);
    expect(performanceMetrics.isSlowApi(100)).toBe(false);
  });

  it('tracks realtime polling with unchanged rate', () => {
    performanceMetrics.recordRealtimePoll('event-stats', 45, true);
    performanceMetrics.recordRealtimePoll('event-stats', 120, false);
    const summary = performanceMetrics.getRealtimeSummary();
    expect(summary[0]?.endpoint).toBe('event-stats');
    expect(summary[0]?.polls).toBe(2);
    expect(summary[0]?.unchanged).toBe(1);
    expect(summary[0]?.unchangedRate).toBe(50);
    expect(summary[0]?.avgMs).toBe(83);
  });
});
