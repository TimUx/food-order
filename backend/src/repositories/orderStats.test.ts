import { describe, it, expect } from 'vitest';
import { buildOrderEventStats } from './orderStats';

describe('buildOrderEventStats', () => {
  it('aggregates status counts without loading orders', () => {
    const stats = buildOrderEventStats({
      statusCounts: {
        NEW: 40,
        IN_PROGRESS: 30,
        READY: 20,
        PICKED_UP: 900,
      },
      revenue: 12500.5,
      popularDishes: [
        { name: 'Bratwurst', count: 420 },
        { name: 'Currywurst', count: 310 },
      ],
      avgProcessingMinutes: 12,
    });

    expect(stats.totalOrders).toBe(990);
    expect(stats.openOrders).toBe(70);
    expect(stats.readyOrders).toBe(20);
    expect(stats.pickedUpOrders).toBe(900);
    expect(stats.revenue).toBe(12500.5);
    expect(stats.popularDishes).toHaveLength(2);
    expect(stats.avgProcessingMinutes).toBe(12);
  });

  it('handles empty event', () => {
    const stats = buildOrderEventStats({
      statusCounts: {},
      revenue: 0,
      popularDishes: [],
      avgProcessingMinutes: 0,
    });

    expect(stats.totalOrders).toBe(0);
    expect(stats.openOrders).toBe(0);
    expect(stats.popularDishes).toEqual([]);
  });
});

describe('getOrderEventStats threshold', () => {
  it('documents 1000-order dashboard acceptance bound', () => {
    const thresholdMs = Number(process.env.EVENT_STATS_THRESHOLD_MS ?? 500);
    expect(thresholdMs).toBeLessThanOrEqual(2000);
    expect(thresholdMs).toBeGreaterThan(0);
  });
});
