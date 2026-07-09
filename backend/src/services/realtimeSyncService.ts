import { createHash } from 'crypto';
import { StatusCode } from '@prisma/client';
import { prisma } from '../config/database';
import { tenantWhere } from '../platform/tenant/tenantScope';
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

export const realtimeSyncService = {
  async syncEventOrders(
    eventId: string,
    statusFilter: StatusCode[] | undefined,
    clientEtag?: string
  ): Promise<SyncResult<Awaited<ReturnType<typeof orderService.getByEvent>>>> {
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
  },

  async syncEventStats(
    eventId: string,
    clientEtag?: string
  ): Promise<SyncResult<Awaited<ReturnType<typeof orderService.getStats>>>> {
    const agg = await prisma.order.aggregate({
      where: tenantWhere({ eventId, status: { not: StatusCode.CANCELLED } }),
      _max: { updatedAt: true },
      _count: true,
    });
    const etag = buildEtag(['stats', eventId, agg._count, agg._max.updatedAt?.toISOString()]);
    if (clientEtag && clientEtag === etag) return unchanged(etag);
    const data = await orderService.getStats(eventId);
    return { changed: true, etag, serverTime: new Date().toISOString(), data };
  },

  async syncPickupBoard(clientEtag?: string): Promise<SyncResult<Awaited<ReturnType<typeof orderService.getReadyOrders>>>> {
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
  },

  async syncOrderByToken(
    lookupToken: string,
    lastName: string | undefined,
    clientEtag?: string
  ): Promise<SyncResult<Awaited<ReturnType<typeof orderService.getByLookupToken>>>> {
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
  },

  async syncPaymentStatus(
    sessionId: string,
    clientEtag?: string
  ): Promise<SyncResult<NonNullable<Awaited<ReturnType<ReturnType<typeof getPaymentServiceRegistry>['getPaymentStatus']>>>>> {
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
  },

  async syncClub(clientEtag?: string): Promise<SyncResult<Awaited<ReturnType<typeof clubService.getPublic>>>> {
    const club = await prisma.clubSettings.findFirst({
      where: tenantWhere(),
      select: { updatedAt: true, clubName: true },
    });
    const etag = buildEtag(['club', club?.updatedAt?.toISOString(), club?.clubName]);
    if (clientEtag && clientEtag === etag) return unchanged(etag);
    const data = await clubService.getPublic();
    return { changed: true, etag, serverTime: new Date().toISOString(), data };
  },
};
