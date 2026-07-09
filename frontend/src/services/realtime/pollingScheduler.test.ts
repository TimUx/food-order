import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PollingScheduler } from './pollingScheduler';

describe('PollingScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at normal interval by default', () => {
    const scheduler = new PollingScheduler();
    expect(scheduler.getIntervalMs()).toBe(4000);
  });

  it('uses high interval after data change', () => {
    const scheduler = new PollingScheduler('normal');
    scheduler.onDataChanged();
    expect(scheduler.getIntervalMs()).toBe(1500);
  });

  it('steps down after quiet period', () => {
    const scheduler = new PollingScheduler('high');
    scheduler.onDataChanged();
    vi.advanceTimersByTime(61_000);
    scheduler.onPollNoChange();
    expect(scheduler.getIntervalMs()).toBe(4000);
  });

  it('respects idle activity hint', () => {
    const scheduler = new PollingScheduler('normal');
    scheduler.setActivityHint('idle');
    expect(scheduler.getIntervalMs()).toBe(45000);
  });
});
