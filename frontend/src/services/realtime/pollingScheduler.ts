import type { ActivityLevel } from './types';

const BASE_INTERVALS: Record<ActivityLevel, number> = {
  high: 1500,
  normal: 4000,
  low: 7500,
  idle: 45000,
};

export class PollingScheduler {
  private level: ActivityLevel;
  private boostUntil = 0;
  private lastChangeAt = Date.now();

  constructor(initial: ActivityLevel = 'normal') {
    this.level = initial;
  }

  setActivityHint(hint: ActivityLevel): void {
    if (hint === 'idle') {
      this.level = 'idle';
    } else if (this.level === 'idle') {
      this.level = hint;
    }
  }

  onDataChanged(): void {
    this.lastChangeAt = Date.now();
    this.boostUntil = Date.now() + 30_000;
    this.level = 'high';
  }

  onPollNoChange(): void {
    const quietMs = Date.now() - this.lastChangeAt;
    if (quietMs < 60_000) return;
    const order: ActivityLevel[] = ['high', 'normal', 'low', 'idle'];
    const idx = order.indexOf(this.level);
    if (idx < order.length - 1) {
      this.level = order[idx + 1];
      this.lastChangeAt = Date.now();
    }
  }

  getIntervalMs(): number {
    if (Date.now() < this.boostUntil) return BASE_INTERVALS.high;
    return BASE_INTERVALS[this.level];
  }

  getLevel(): ActivityLevel {
    return this.level;
  }
}
