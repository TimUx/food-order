import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || '';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

export function joinEvent(eventId: string): void {
  getSocket().emit('join:event', eventId);
}

export function joinOrder(orderId: string): void {
  getSocket().emit('join:order', orderId);
}

export function leaveOrder(orderId: string): void {
  getSocket().emit('leave:order', orderId);
}

export function onOrderUpdated(callback: (order: unknown) => void): () => void {
  const s = getSocket();
  s.on('order:updated', callback);
  return () => s.off('order:updated', callback);
}

export function onOrderCreated(callback: (order: unknown) => void): () => void {
  const s = getSocket();
  s.on('order:created', callback);
  return () => s.off('order:created', callback);
}

export function onEventUpdated(callback: (event: unknown) => void): () => void {
  const s = getSocket();
  s.on('event:updated', callback);
  return () => s.off('event:updated', callback);
}

export function onFoodItemsUpdated(callback: (items: unknown) => void): () => void {
  const s = getSocket();
  s.on('fooditems:updated', callback);
  return () => s.off('fooditems:updated', callback);
}
