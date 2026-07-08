import { StatusCode } from '@prisma/client';

export const STATUS_LABELS: Record<StatusCode, string> = {
  NEW: 'Neu',
  IN_PROGRESS: 'In Bearbeitung',
  READY: 'Fertig',
  PICKED_UP: 'Abgeholt',
  CANCELLED: 'Storniert',
};

export const SOURCE_LABELS = {
  ONLINE: 'Online',
  CASHIER: 'Vor Ort',
};

export function formatOrderNumber(num: number): string {
  return num.toString().padStart(3, '0');
}

export function getTodayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** Normalisiert ein Datum auf UTC-Mitternacht (Veranstaltungstag). */
export function normalizeDate(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Bestellnummern und orderDate beziehen sich auf den Veranstaltungstag –
 * auch bei Vorausbestellungen Tage oder Wochen vorher.
 */
export function getEventOrderDate(eventDate: Date | string): Date {
  return normalizeDate(eventDate);
}

export function formatEventDate(date: Date | string): string {
  return normalizeDate(date).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatPrice(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(num);
}

export const VALID_TRANSITIONS: Record<StatusCode, StatusCode[]> = {
  NEW: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['READY', 'CANCELLED'],
  READY: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: [],
  CANCELLED: [],
};

export function canTransition(from: StatusCode, to: StatusCode): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function getNextStatus(current: StatusCode): StatusCode | null {
  const flow: StatusCode[] = ['NEW', 'IN_PROGRESS', 'READY', 'PICKED_UP'];
  const idx = flow.indexOf(current);
  if (idx === -1 || idx >= flow.length - 1) return null;
  return flow[idx + 1];
}

/** Kombiniert Veranstaltungsdatum und Startzeit zu einem Zeitpunkt (UTC). */
export function getEventStartDateTime(eventDate: Date | string, startTime: string): Date {
  const d = normalizeDate(eventDate);
  const [hours, minutes] = startTime.split(':').map(Number);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hours, minutes));
}

/** Stornierungsfrist: X Stunden vor Veranstaltungsbeginn. */
export function getCancellationDeadline(
  eventDate: Date | string,
  startTime: string,
  hoursBefore: number
): Date {
  const eventStart = getEventStartDateTime(eventDate, startTime);
  return new Date(eventStart.getTime() - hoursBefore * 60 * 60 * 1000);
}

export function formatDateTimeDE(date: Date): string {
  return date.toLocaleString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

const CANCELLABLE_STATUSES: StatusCode[] = ['NEW', 'IN_PROGRESS'];

export function canCustomerCancelOrder(
  status: StatusCode,
  source: string,
  eventDate: Date | string,
  startTime: string,
  cancellationDeadlineHours: number,
  now: Date = new Date()
): boolean {
  if (source !== 'ONLINE') return false;
  if (!CANCELLABLE_STATUSES.includes(status)) return false;
  const deadline = getCancellationDeadline(eventDate, startTime, cancellationDeadlineHours);
  return now < deadline;
}
