/**
 * Interner Socket.IO-Transport — nur vom RealtimeService verwenden.
 */
import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || '';

let socket: Socket | null = null;
let authToken: string | null = null;
let tenantSlug: string | null = null;
let lastJoinedEventId: string | null = null;

type SocketEventHandler = {
  event: string;
  handler: (payload: unknown) => void;
};

const externalHandlers = new Set<SocketEventHandler>();

function getOrCreateSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      auth: {
        token: authToken ?? undefined,
        tenantSlug: tenantSlug ?? undefined,
      },
    });
  }
  return socket;
}

export const socketTransport = {
  connect(): Socket {
    const s = getOrCreateSocket();
    if (!s.connected) s.connect();
    return s;
  },

  disconnect(): void {
    socket?.disconnect();
  },

  isConnected(): boolean {
    return Boolean(socket?.connected);
  },

  setAuthToken(token: string | null): void {
    authToken = token;
    if (socket) {
      socket.auth = {
        ...(typeof socket.auth === 'object' && socket.auth ? socket.auth : {}),
        token: token ?? undefined,
        tenantSlug: tenantSlug ?? undefined,
      };
    }
  },

  setTenantSlug(slug: string | null): void {
    tenantSlug = slug;
    if (socket) {
      socket.auth = {
        ...(typeof socket.auth === 'object' && socket.auth ? socket.auth : {}),
        token: authToken ?? undefined,
        tenantSlug: slug ?? undefined,
      };
    }
  },

  onConnect(handler: () => void): () => void {
    const s = getOrCreateSocket();
    s.on('connect', handler);
    return () => s.off('connect', handler);
  },

  onDisconnect(handler: (reason: string) => void): () => void {
    const s = getOrCreateSocket();
    s.on('disconnect', handler);
    return () => s.off('disconnect', handler);
  },

  onReconnectAttempt(handler: () => void): () => void {
    const s = getOrCreateSocket();
    s.io.on('reconnect_attempt', handler);
    return () => s.io.off('reconnect_attempt', handler);
  },

  joinEvent(eventId: string): void {
    lastJoinedEventId = eventId;
    getOrCreateSocket().emit('join:event', eventId);
  },

  rejoinEvent(): void {
    if (lastJoinedEventId) {
      getOrCreateSocket().emit('join:event', lastJoinedEventId);
    }
  },

  joinPickupBoard(eventId: string): void {
    getOrCreateSocket().emit('join:pickup-board', eventId);
  },

  joinOrder(lookupToken: string, lastName?: string): void {
    getOrCreateSocket().emit('join:order', { lookupToken, lastName });
  },

  leaveOrder(orderId: string): void {
    getOrCreateSocket().emit('leave:order', orderId);
  },

  subscribe(event: string, handler: (payload: unknown) => void): () => void {
    const entry: SocketEventHandler = { event, handler };
    externalHandlers.add(entry);
    const s = getOrCreateSocket();
    s.on(event, handler);
    return () => {
      externalHandlers.delete(entry);
      s.off(event, handler);
    };
  },

  probeConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      if (socket?.connected) {
        resolve(true);
        return;
      }
      const s = getOrCreateSocket();
      const timeout = window.setTimeout(() => {
        cleanup();
        resolve(false);
      }, 5000);
      const onConnect = () => {
        cleanup();
        resolve(true);
      };
      const cleanup = () => {
        window.clearTimeout(timeout);
        s.off('connect', onConnect);
      };
      s.once('connect', onConnect);
      if (!s.connected) s.connect();
    });
  },
};
