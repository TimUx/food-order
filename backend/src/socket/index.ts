import { Server as HttpServer } from 'http';
import type { Request } from 'express';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { corsPolicy } from '../middleware/corsPolicy';
import { logger } from '../utils/logger';
import type { AuthPayload } from '../middleware/auth';
import { eventRepository, orderRepository } from '../repositories';
import { tenantContext, tenantResolver } from '../platform/bootstrap';
import { performanceMetrics } from '../platform/metrics/performanceMetrics';
import type { TenantContextData } from '../platform/tenant/types';

let io: Server | null = null;

type SocketData = {
  user?: AuthPayload;
  tenant?: TenantContextData;
};

function isStaff(user?: AuthPayload): boolean {
  return Boolean(user && (user.role === 'ADMIN' || user.role === 'STAFF'));
}

function scopedRoom(tenantId: string, room: string): string {
  return `tenant:${tenantId}:${room}`;
}

async function verifyOrderAccess(
  lookupToken: string,
  lastName?: string,
  user?: AuthPayload
): Promise<boolean> {
  if (isStaff(user)) return true;
  if (!lastName?.trim()) return false;
  const order = await orderRepository.findByLookupToken(lookupToken);
  if (!order?.customer) return false;
  return order.customer.lastName.toLowerCase() === lastName.trim().toLowerCase();
}

function runWithTenant<T>(tenant: TenantContextData, fn: () => T): T {
  return tenantContext.run(tenant, fn);
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: corsPolicy.socketOrigins(),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    void (async () => {
      try {
        const fakeReq = {
          headers: socket.handshake.headers,
          hostname: socket.handshake.headers.host?.split(':')[0],
          path: '/socket.io/',
        } as Request;

        const result = await tenantResolver.resolve(fakeReq);
        if (result.type !== 'tenant' || !result.tenant) {
          next(new Error('Mandanten-Kontext erforderlich'));
          return;
        }

        (socket.data as SocketData).tenant = result.tenant;

        const token = socket.handshake.auth?.token as string | undefined;
        if (token) {
          try {
            const payload = jwt.verify(token, config.jwt.secret) as AuthPayload;
            if (payload.impersonation) {
              const { platformSessionService } = await import('../services/platformSessionService');
              const valid = await platformSessionService.validateSession(
                payload.impersonation.platformSessionId
              );
              if (!valid) {
                next(new Error('Impersonation-Sitzung ungültig'));
                return;
              }
            } else if (payload.sessionId) {
              const { sessionService } = await import('../services/sessionService');
              const valid = await sessionService.validateSession(payload.sessionId);
              if (!valid) {
                next(new Error('Sitzung ungültig'));
                return;
              }
            }
            if (payload.tenantId && payload.tenantId !== result.tenant.id && !payload.impersonation) {
              next(new Error('Token gehört zu einem anderen Mandanten'));
              return;
            }
            (socket.data as SocketData).user = payload;
          } catch {
            // Gast-Verbindung ohne gültiges Token (Bestellstatus mit Nachname)
          }
        }

        next();
      } catch {
        next(new Error('Ungültiger Host'));
      }
    })();
  });

  io.on('connection', (socket: Socket) => {
    const data = socket.data as SocketData;
    const tenant = data.tenant;
    if (!tenant) {
      socket.disconnect(true);
      return;
    }

    logger.info(`Socket verbunden: ${socket.id}${data.user ? ` (${data.user.role})` : ''}`, {
      tenant_id: tenant.id,
    });
    performanceMetrics.recordSocketConnect();

    socket.on('join:event', (eventId: string, callback?: (err?: string) => void) => {
      void runWithTenant(tenant, async () => {
        if (!isStaff(data.user)) {
          callback?.('Nicht autorisiert');
          return;
        }
        const event = await eventRepository.findById(eventId);
        if (!event) {
          callback?.('Veranstaltung nicht gefunden');
          return;
        }
        socket.join(scopedRoom(tenant.id, `event:${eventId}`));
        socket.join(scopedRoom(tenant.id, `staff:event:${eventId}`));
        callback?.();
      });
    });

    socket.on(
      'join:order',
      async (payload: string | { lookupToken: string; lastName?: string }, callback?: (err?: string) => void) => {
        await runWithTenant(tenant, async () => {
          const lookupToken = typeof payload === 'string' ? payload : payload.lookupToken;
          const lastName = typeof payload === 'string' ? undefined : payload.lastName;
          const ok = await verifyOrderAccess(lookupToken, lastName, data.user);
          if (!ok) {
            callback?.('Nicht autorisiert');
            return;
          }
          const order = await orderRepository.findByLookupToken(lookupToken);
          if (!order) {
            callback?.('Nicht autorisiert');
            return;
          }
          socket.join(scopedRoom(tenant.id, `order:${order.id}`));
          callback?.();
        });
      }
    );

    socket.on('join:pickup-board', (eventId: string, callback?: (err?: string) => void) => {
      void runWithTenant(tenant, async () => {
        if (!isStaff(data.user)) {
          callback?.('Nicht autorisiert');
          return;
        }
        const event = await eventRepository.findById(eventId);
        if (!event) {
          callback?.('Veranstaltung nicht gefunden');
          return;
        }
        socket.join(scopedRoom(tenant.id, `pickup:${eventId}`));
        callback?.();
      });
    });

    socket.on('leave:order', (orderId: string) => {
      socket.leave(scopedRoom(tenant.id, `order:${orderId}`));
    });

    socket.on('disconnect', () => {
      performanceMetrics.recordSocketDisconnect();
      logger.info(`Socket getrennt: ${socket.id}`, { tenant_id: tenant.id });
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO nicht initialisiert');
  return io;
}

function requireTenantRoomPrefix(): string {
  const tenantId = tenantContext.id();
  if (!tenantId) {
    throw new Error('Tenant-Kontext fehlt für Socket-Emission');
  }
  return tenantId;
}

export function emitOrderUpdate(eventId: string, order: unknown): void {
  if (!io) return;
  const tenantId = requireTenantRoomPrefix();
  io.to(scopedRoom(tenantId, `staff:event:${eventId}`)).emit('order:updated', order);
  io.to(scopedRoom(tenantId, `pickup:${eventId}`)).emit('order:updated', order);
  const orderData = order as { id: string };
  io.to(scopedRoom(tenantId, `order:${orderData.id}`)).emit('order:updated', order);
}

export function emitOrderCreated(eventId: string, order: unknown): void {
  if (!io) return;
  const tenantId = requireTenantRoomPrefix();
  io.to(scopedRoom(tenantId, `staff:event:${eventId}`)).emit('order:created', order);
}

export function emitEventUpdate(event: unknown): void {
  if (!io) return;
  const tenantId = requireTenantRoomPrefix();
  io.to(scopedRoom(tenantId, 'broadcast')).emit('event:updated', event);
}

export function emitFoodItemsUpdate(eventId: string, items: unknown): void {
  if (!io) return;
  const tenantId = requireTenantRoomPrefix();
  io.to(scopedRoom(tenantId, `staff:event:${eventId}`)).emit('fooditems:updated', items);
}

export function emitClubUpdate(club: unknown): void {
  if (!io) return;
  const tenantId = requireTenantRoomPrefix();
  io.to(scopedRoom(tenantId, 'broadcast')).emit('club:updated', club);
}

export function getSocketStats(): { active: number; peak: number } {
  return performanceMetrics.getSocketStats();
}

export function emitPrintJob(eventId: string, job: unknown): void {
  if (!io) return;
  const tenantId = requireTenantRoomPrefix();
  io.to(scopedRoom(tenantId, `staff:event:${eventId}`)).emit('print:job', job);
}
