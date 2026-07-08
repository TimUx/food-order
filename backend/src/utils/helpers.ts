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
  CASHIER: 'Kasse',
};

export function formatOrderNumber(num: number): string {
  return num.toString().padStart(3, '0');
}

export function getTodayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
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
