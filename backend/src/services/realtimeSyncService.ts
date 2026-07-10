import { createHash } from 'crypto';
import { StatusCode } from '@prisma/client';
import { prisma } from '../config/database';
import { tenantWhere } from '../platform/tenant/tenantScope';
import { performanceMetrics } from '../platform/metrics/performanceMetrics';
import { orderService } from './orderService';
import { eventService } from './eventService';
import { clubService } from './clubService';
import { getPaymentServiceRegistry } from '../core/extensionPoints';

export interface SyncResult<T> {
  changed: boolean;
  etag: string;
  serverTime: string;
  data?: T;
}

function buildEtag(parts: (string | number | null | undefined)[]): string {
  return createHash('sha256')
    .update(parts.map((p) => String(p ?? '')).join('|'))
    .digest('hex')
    .slice(0, 16);
}

function unchanged<T>(etag: string): SyncResult<T> {
  return { changed: false, etag, serverTime: new Date().toISOString() };
}

async function trackRealtimePoll<T>(
  endpoint: string,
  run: () => Promise<SyncResult<T>>
): Promise<SyncResult<T>> {
  const start = performance.now();
  const result = await run();
  performanceMetrics.recordRealtimePoll(endpoint, Math.round(performance.now() - start), !result.changed);
  return result;
}

export const realtimeSyncService = {
  async syncEventOrders(
    eventId: string,
    statusFilter: StatusCode[] | undefined,
    clientEtag?: string
  ): Promise<SyncResult<Awaited<ReturnType<typeof orderService.getByEvent>>>> {
    return trackRealtimePoll('event-orders', async () => {
      const where = tenantWhere({
        eventId,
        ...(statusFilter?.length ? { status: { in: statusFilter } } : {}),
      });
      const agg = await prisma.order.aggregate({
        where,
        _max: { updatedAt: true },
        _count: true,
      });
      const etag = buildEtag([
        'orders',
        eventId,
        statusFilter?.join(',') ?? '',
        agg._count,
        agg._max.updatedAt?.toISOString(),
      ]);
      if (clientEtag && clientEtag === etag) return unchanged(etag);
      const data = await orderService.getByEvent(eventId, statusFilter);
      return { changed: true, etag, serverTime: new Date().toISOString(), data };
    });
  },

  async syncEventStats(
    eventId: string,
    clientEtag?: string
  ): Promise<SyncResult<Awaited<ReturnType<typeof orderService.getStats>>>> {
    return trackRealtimePoll('event-stats', async () => {
      const agg = await prisma.order.aggregate({
        where: tenantWhere({ eventId, status: { not: StatusCode.CANCELLED } }),
        _max: { updatedAt: true },
        _count: true,
      });
      const etag = buildEtag(['stats', eventId, agg._count, agg._max.updatedAt?.toISOString()]);
      if (clientEtag && clientEtag === etag) return unchanged(etag);
      const data = await orderService.getStats(eventId);
      return { changed: true, etag, serverTime: new Date().toISOString(), data };
    });
  },

  async syncPickupBoard(clientEtag?: string): Promise<SyncResult<Awaited<ReturnType<typeof orderService.getReadyOrders>>>> {
    return trackRealtimePoll('pickup-board', async () => {
      const event = await eventService.getActive();
      const agg = await prisma.order.aggregate({
        where: tenantWhere({ eventId: event.id, status: StatusCode.READY }),
        _max: { updatedAt: true },
        _count: true,
      });
      const etag = buildEtag(['pickup', event.id, agg._count, agg._max.updatedAt?.toISOString()]);
      if (clientEtag && clientEtag === etag) return unchanged(etag);
      const data = await orderService.getReadyOrders(event.id);
      return { changed: true, etag, serverTime: new Date().toISOString(), data };
    });
  },

  async syncOrderByToken(
    lookupToken: string,
    lastName: string | undefined,
    clientEtag?: string
  ): Promise<SyncResult<Awaited<ReturnType<typeof orderService.getByLookupToken>>>> {
    return trackRealtimePoll('order-token', async () => {
      const order = await prisma.order.findFirst({
        where: tenantWhere({ lookupToken }),
        select: { id: true, updatedAt: true, status: true },
      });
      if (!order) {
        const etag = buildEtag(['order', lookupToken, 'missing']);
        if (clientEtag === etag) return unchanged(etag);
        return { changed: true, etag, serverTime: new Date().toISOString(), data: undefined };
      }
      const etag = buildEtag(['order', order.id, order.status, order.updatedAt.toISOString()]);
      if (clientEtag && clientEtag === etag) return unchanged(etag);
      const data = await orderService.getByLookupToken(lookupToken, lastName);
      return { changed: true, etag, serverTime: new Date().toISOString(), data };
    });
  },

  async syncPaymentStatus(
    sessionId: string,
    clientEtag?: string
  ): Promise<SyncResult<NonNullable<Awaited<ReturnType<ReturnType<typeof getPaymentServiceRegistry>['getPaymentStatus']>>>>> {
    return trackRealtimePoll('payment-status', async () => {
      const status = await getPaymentServiceRegistry().getPaymentStatus(sessionId);
      if (!status) {
        const etag = buildEtag(['payment', sessionId, 'missing']);
        if (clientEtag === etag) return unchanged(etag);
        return { changed: true, etag, serverTime: new Date().toISOString(), data: undefined };
      }
      const etag = buildEtag([
        'payment',
        sessionId,
        status.paymentStatus,
        status.checkoutUrl ?? '',
      ]);
      if (clientEtag && clientEtag === etag) return unchanged(etag);
      return { changed: true, etag, serverTime: new Date().toISOString(), data: status };
    });
  },

  async syncClub(clientEtag?: string): Promise<SyncResult<Awaited<ReturnType<typeof clubService.getPublic>>>> {
    return trackRealtimePoll('club', async () => {
      const club = await prisma.clubSettings.findFirst({
        where: tenantWhere(),
        select: { updatedAt: true, clubName: true },
      });
      const etag = buildEtag(['club', club?.updatedAt?.toISOString(), club?.clubName]);
      if (clientEtag && clientEtag === etag) return unchanged(etag);
      const data = await clubService.getPublic();
      return { changed: true, etag, serverTime: new Date().toISOString(), data };
    });
  },
};
