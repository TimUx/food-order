import { describe, it, expect } from 'vitest';
import { resolvePreferredStaffEventId } from '@/utils/eventSelection';
import type { Event } from '@/types';

const today = new Date().toISOString().split('T')[0];

function event(overrides: Partial<Event> & Pick<Event, 'id' | 'name'>): Event {
  return {
    date: today,
    startTime: '10:00',
    endTime: '22:00',
    onlineOrdersActive: true,
    cashierActive: true,
    ordersClosed: false,
    isActive: true,
    ...overrides,
  };
}

describe('resolvePreferredStaffEventId', () => {
  it('wählt die einzige aktive Veranstaltung bei mehreren inaktiven am selben Tag', () => {
    const events = [
      event({ id: '1', name: 'Herbstfest', isActive: false }),
      event({ id: '2', name: 'Sommerfest Haupttag', isActive: true }),
      event({ id: '3', name: 'Sommerfest Vortag', isActive: false }),
    ];
    expect(resolvePreferredStaffEventId(events)).toBe('2');
  });

  it('gibt leer zurück wenn keine aktive Veranstaltung existiert', () => {
    const events = [
      event({ id: '1', name: 'Herbstfest', isActive: false }),
      event({ id: '2', name: 'Sommerfest Vortag', isActive: false }),
    ];
    expect(resolvePreferredStaffEventId(events)).toBe('');
  });
});
