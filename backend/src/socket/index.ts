import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { AuthPayload } from '../middleware/auth';
import { orderRepository } from '../repositories';

let io: Server | null = null;

type SocketData = {
  user?: AuthPayload;
};

function isStaff(user?: AuthPayload): boolean {
  return Boolean(user && (user.role === 'ADMIN' || user.role === 'STAFF'));
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

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (token) {
      try {
        (socket.data as SocketData).user = jwt.verify(token, config.jwt.secret) as AuthPayload;
      } catch {
        // Gast-Verbindung ohne Token erlaubt (für Bestellstatus mit Nachname)
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    const data = socket.data as SocketData;
    logger.info(`Socket verbunden: ${socket.id}${data.user ? ` (${data.user.role})` : ''}`);

    socket.on('join:event', async (eventId: string, callback?: (err?: string) => void) => {
      if (!isStaff(data.user)) {
        const msg = 'Nicht autorisiert';
        callback?.(msg);
        return;
      }
      socket.join(`event:${eventId}`);
      socket.join(`staff:event:${eventId}`);
      logger.info(`Socket ${socket.id} joined staff event:${eventId}`);
      callback?.();
    });

    socket.on(
      'join:order',
      async (payload: string | { lookupToken: string; lastName?: string }, callback?: (err?: string) => void) => {
        const lookupToken = typeof payload === 'string' ? payload : payload.lookupToken;
        const lastName = typeof payload === 'string' ? undefined : payload.lastName;
        const ok = await verifyOrderAccess(lookupToken, lastName, data.user);
        if (!ok) {
          const msg = 'Nicht autorisiert';
          callback?.(msg);
          return;
        }
        const order = await orderRepository.findByLookupToken(lookupToken);
        if (!order) {
          callback?.('Nicht autorisiert');
          return;
        }
        socket.join(`order:${order.id}`);
        callback?.();
      }
    );

    socket.on('join:pickup-board', async (eventId: string, callback?: (err?: string) => void) => {
      // Öffentliches Abholboard – nur anonyme Abholnummern, kein PII
      socket.join(`pickup:${eventId}`);
      callback?.();
    });

    socket.on('leave:order', (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket getrennt: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO nicht initialisiert');
  return io;
}

export function emitOrderUpdate(eventId: string, order: unknown): void {
  if (!io) return;
  io.to(`staff:event:${eventId}`).emit('order:updated', order);
  io.to(`pickup:${eventId}`).emit('order:updated', order);
  const orderData = order as { id: string };
  io.to(`order:${orderData.id}`).emit('order:updated', order);
}

export function emitOrderCreated(eventId: string, order: unknown): void {
  if (!io) return;
  io.to(`staff:event:${eventId}`).emit('order:created', order);
}

export function emitEventUpdate(event: unknown): void {
  if (!io) return;
  io.emit('event:updated', event);
}

export function emitFoodItemsUpdate(eventId: string, items: unknown): void {
  if (!io) return;
  io.to(`staff:event:${eventId}`).emit('fooditems:updated', items);
}

export function emitClubUpdate(club: unknown): void {
  if (!io) return;
  io.emit('club:updated', club);
}

export function emitPrintJob(eventId: string, job: unknown): void {
  if (!io) return;
  io.to(`staff:event:${eventId}`).emit('print:job', job);
}
