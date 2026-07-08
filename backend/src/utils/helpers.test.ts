import { describe, it, expect } from 'vitest';
import {
  canTransition,
  formatOrderNumber,
  getNextStatus,
  getEventOrderDate,
  formatEventDate,
  getCancellationDeadline,
  canCustomerCancelOrder,
} from './helpers';

describe('helpers', () => {
  it('formatiert Bestellnummern korrekt', () => {
    expect(formatOrderNumber(1)).toBe('001');
    expect(formatOrderNumber(42)).toBe('042');
    expect(formatOrderNumber(123)).toBe('123');
  });

  it('verwendet Veranstaltungsdatum für Vorausbestellungen', () => {
    const eventDate = '2026-08-15T00:00:00.000Z';
    const orderDate = getEventOrderDate(eventDate);
    expect(orderDate.toISOString()).toBe('2026-08-15T00:00:00.000Z');
    expect(formatEventDate(eventDate)).toContain('2026');
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

  it('berechnet Stornierungsfrist', () => {
    const deadline = getCancellationDeadline('2026-08-15T00:00:00.000Z', '18:00', 24);
    expect(deadline.toISOString()).toBe('2026-08-14T18:00:00.000Z');
    expect(canCustomerCancelOrder('NEW', 'ONLINE', '2026-08-15T00:00:00.000Z', '18:00', 24, new Date('2026-08-14T12:00:00.000Z'))).toBe(true);
    expect(canCustomerCancelOrder('NEW', 'ONLINE', '2026-08-15T00:00:00.000Z', '18:00', 24, new Date('2026-08-14T19:00:00.000Z'))).toBe(false);
    expect(canCustomerCancelOrder('READY', 'ONLINE', '2026-08-15T00:00:00.000Z', '18:00', 24)).toBe(false);
  });
});
