import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config';
import { logger } from '../utils/logger';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`Socket verbunden: ${socket.id}`);

    socket.on('join:event', (eventId: string) => {
      socket.join(`event:${eventId}`);
      logger.info(`Socket ${socket.id} joined event:${eventId}`);
    });

    socket.on('join:order', (orderId: string) => {
      socket.join(`order:${orderId}`);
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
  io.to(`event:${eventId}`).emit('order:updated', order);
  const orderData = order as { id: string };
  io.to(`order:${orderData.id}`).emit('order:updated', order);
}

export function emitOrderCreated(eventId: string, order: unknown): void {
  if (!io) return;
  io.to(`event:${eventId}`).emit('order:created', order);
}

export function emitEventUpdate(event: unknown): void {
  if (!io) return;
  io.emit('event:updated', event);
}

export function emitFoodItemsUpdate(eventId: string, items: unknown): void {
  if (!io) return;
  io.to(`event:${eventId}`).emit('fooditems:updated', items);
}
