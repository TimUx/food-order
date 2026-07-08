import { describe, it, expect } from 'vitest';
import { canTransition, formatOrderNumber, getNextStatus } from './helpers';

describe('helpers', () => {
  it('formatiert Bestellnummern korrekt', () => {
    expect(formatOrderNumber(1)).toBe('001');
    expect(formatOrderNumber(42)).toBe('042');
    expect(formatOrderNumber(123)).toBe('123');
  });

  it('erlaubt gültige Statusübergänge', () => {
    expect(canTransition('NEW', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('NEW', 'READY')).toBe(false);
    expect(canTransition('READY', 'PICKED_UP')).toBe(true);
    expect(canTransition('PICKED_UP', 'CANCELLED')).toBe(false);
  });

  it('liefert nächsten Status', () => {
    expect(getNextStatus('NEW')).toBe('IN_PROGRESS');
    expect(getNextStatus('IN_PROGRESS')).toBe('READY');
    expect(getNextStatus('READY')).toBe('PICKED_UP');
    expect(getNextStatus('PICKED_UP')).toBe(null);
  });
});
