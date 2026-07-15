import type { Event, PublicEvent } from '@/types';

export function eventDateKey(date: string): string {
  return date.split('T')[0];
}

export function eventToPublicEvent(event: Event): PublicEvent {
  const parsed = new Date(event.date);
  const eventDateLabel = Number.isNaN(parsed.getTime())
    ? event.date
    : parsed.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    date: event.date,
    eventDateLabel,
    startTime: event.startTime,
    endTime: event.endTime,
  };
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

function isStaffSelectableEvent(event: Event): boolean {
  return event.isActive && !event.ordersClosed;
}

/** Bevorzugt aktive, offene Veranstaltungen — wichtig wenn mehrere Events am selben Tag existieren. */
export function resolvePreferredStaffEventId(events: Event[]): string {
  if (events.length === 0) return '';
  const selectable = events.filter(isStaffSelectableEvent);
  if (selectable.length === 1) return selectable[0].id;

  const today = new Date().toISOString().split('T')[0];
  const todaySelectable = selectable.filter((event) => eventDateKey(event.date) === today);
  if (todaySelectable.length === 1) return todaySelectable[0].id;

  const defaultId = resolveDefaultEventId(events.map(eventToPublicEvent));
  if (defaultId && selectable.some((event) => event.id === defaultId)) {
    return defaultId;
  }

  return todaySelectable[0]?.id ?? selectable[0]?.id ?? '';
}
