import type { Order, DashboardStats, PickupBoardOrder } from '@/types';
import type { ClubSettings } from '@/types/club';
import type { OrderPaymentInfo } from '@/types/payment';
import { api } from '@/services/api';
import { realtimeService } from './RealtimeService';
import type { ActivityLevel, SubscribeOptions } from './types';

const ORDER_WS_EVENTS = ['order:created', 'order:updated'];

export function subscribeEventOrders(
  token: string,
  eventId: string,
  statusFilter: string,
  onData: (orders: Order[]) => void,
  activity: ActivityLevel = 'high'
): () => void {
  realtimeService.joinEvent(eventId);
  return realtimeService.subscribe(
    `staff:event:${eventId}:orders:${statusFilter}`,
    () => {},
    {
      wsEvents: ORDER_WS_EVENTS,
      join: () => realtimeService.joinEvent(eventId),
      activity,
      poll: (etag) => api.syncEventOrders(token, eventId, statusFilter || undefined, etag),
      onPollData: (data) => onData(data as Order[]),
    }
  );
}

export function subscribeEventStats(
  token: string,
  eventId: string,
  onData: (stats: DashboardStats) => void,
  activity: ActivityLevel = 'normal'
): () => void {
  realtimeService.joinEvent(eventId);
  return realtimeService.subscribe(
    `staff:event:${eventId}:stats`,
    () => {},
    {
      wsEvents: ORDER_WS_EVENTS,
      join: () => realtimeService.joinEvent(eventId),
      activity,
      poll: (etag) => api.syncEventStats(token, eventId, etag),
      onPollData: (data) => onData(data as DashboardStats),
    }
  );
}

export function subscribePickupBoard(
  eventId: string,
  onData: (orders: PickupBoardOrder[]) => void
): () => void {
  return realtimeService.subscribe(
    `pickup:${eventId}`,
    () => {},
    {
      wsEvents: ['order:updated'],
      join: () => realtimeService.joinPickupBoard(eventId),
      activity: 'high',
      poll: (etag) => api.syncPickupBoard(etag),
      onPollData: (data) => onData(data as PickupBoardOrder[]),
    }
  );
}

export function subscribeOrderStatus(
  lookupToken: string,
  lastName: string | undefined,
  onData: (order: Order) => void
): () => void {
  return realtimeService.subscribe(
    `order:${lookupToken}`,
    (msg) => {
      if (msg.type === 'order:updated' && msg.payload) {
        onData(msg.payload as Order);
      }
    },
    {
      wsEvents: ['order:updated'],
      join: () => realtimeService.joinOrder(lookupToken, lastName),
      activity: 'normal',
      poll: (etag) => api.syncOrder(lookupToken, lastName, etag),
      onPollData: (data) => {
        if (data) onData(data as Order);
      },
    }
  );
}

export function subscribePaymentStatus(
  sessionId: string,
  onData: (status: OrderPaymentInfo) => void,
  activity: ActivityLevel = 'high'
): () => void {
  return realtimeService.subscribe(
    `payment:${sessionId}`,
    () => {},
    {
      activity,
      poll: (etag) => api.syncPaymentStatus(sessionId, etag),
      onPollData: (data) => {
        if (data) onData(data as OrderPaymentInfo);
      },
      pollOnWsEvent: false,
    }
  );
}

export function subscribeClubUpdates(onData: (club: ClubSettings) => void): () => void {
  return realtimeService.subscribe(
    'club',
    (msg) => {
      if (msg.type === 'club:updated' && msg.payload) {
        onData(msg.payload as ClubSettings);
      }
    },
    {
      wsEvents: ['club:updated'],
      activity: 'idle',
      poll: (etag) => api.syncClub(etag),
      onPollData: (data) => onData(data as ClubSettings),
    }
  );
}

export function subscribePrintJobs(
  handler: (job: {
    jobId: string;
    printerId: string;
    printerName: string;
    template: string;
    title: string;
    html?: string;
    lines?: string[];
    pdfBase64?: string;
  }) => void
): () => void {
  realtimeService.connect();
  return realtimeService.subscribe(
    'print:job',
    (msg) => handler(msg.payload as Parameters<typeof handler>[0]),
    {
      wsEvents: ['print:job'],
      activity: 'idle',
      pollOnWsEvent: false,
    }
  );
}

export type { SubscribeOptions };
