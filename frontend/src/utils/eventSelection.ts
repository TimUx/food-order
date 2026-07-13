import type { PublicEvent } from '@/types';

export function eventDateKey(date: string): string {
  return date.split('T')[0];
}

export function findTodayEvents(events: PublicEvent[]): PublicEvent[] {
  const today = new Date().toISOString().split('T')[0];
  return events.filter((event) => eventDateKey(event.date) === today);
}

/** Eindeutige Vorauswahl: eine Veranstaltung gesamt oder genau eine am heutigen Tag. */
export function resolveDefaultEventId(events: PublicEvent[]): string | null {
  if (events.length === 0) return null;
  if (events.length === 1) return events[0].id;
  const todayEvents = findTodayEvents(events);
  if (todayEvents.length === 1) return todayEvents[0].id;
  return null;
}

export function resolvePreferredEventId(events: PublicEvent[]): string {
  return resolveDefaultEventId(events) ?? findTodayEvents(events)[0]?.id ?? '';
}
