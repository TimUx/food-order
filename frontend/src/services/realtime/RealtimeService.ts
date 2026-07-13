import { PollingScheduler } from './pollingScheduler';
import { socketTransport } from './socketTransport';
import type {
  ActivityLevel,
  ConnectionState,
  RealtimeDiagnostics,
  RealtimeHandler,
  RealtimeMessage,
  SubscribeOptions,
} from './types';

type Subscription = {
  channel: string;
  handlers: Set<RealtimeHandler>;
  options: SubscribeOptions<unknown>;
  scheduler: PollingScheduler;
  lastEtag?: string;
  pollTimer?: ReturnType<typeof setTimeout>;
  wsUnsubs: Array<() => void>;
  join?: () => void;
  leave?: () => void;
};

const LOG_PREFIX = '[Realtime]';

class RealtimeServiceImpl {
  private state: ConnectionState = 'DISCONNECTED';
  private authToken: string | null = null;
  private subscriptions = new Map<string, Subscription>();
  private stateListeners = new Set<() => void>();
  private reconnectListeners = new Set<() => void>();
  private disconnectListeners = new Set<() => void>();
  private reconnectCount = 0;
  private wsProbeTimer?: ReturnType<typeof setTimeout>;
  private online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private connectedOnce = false;
  private transportUnsubs: Array<() => void> = [];
  private lastPollingIntervalMs: number | null = null;
  private pollingActive = false;
  private connectStarted = false;
  private readonly diagnosticsSnapshot: RealtimeDiagnostics = {
    state: 'DISCONNECTED',
    transport: 'none',
    pollingIntervalMs: null,
    reconnectCount: 0,
    subscriptionCount: 0,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleBrowserOnline);
      window.addEventListener('offline', this.handleBrowserOffline);
    }
  }

  connect(token?: string | null): void {
    if (token !== undefined) {
      this.authToken = token;
      socketTransport.setAuthToken(token);
    }
    if (this.connectStarted) {
      socketTransport.connect();
      return;
    }
    this.connectStarted = true;
    this.log('Verbindung wird aufgebaut');
    this.setState('CONNECTING');
    this.attachTransportHandlers();
    socketTransport.connect();
    this.scheduleWsProbe();
  }

  disconnect(): void {
    this.log('Verbindung getrennt (manuell)');
    this.stopAllPolling();
    this.clearWsProbe();
    socketTransport.disconnect();
    this.setState('DISCONNECTED');
    this.connectStarted = false;
  }

  subscribe(channel: string, handler: RealtimeHandler, options: SubscribeOptions<unknown> = {}): () => void {
    this.connect(this.authToken);

    let sub = this.subscriptions.get(channel);
    if (!sub) {
      sub = {
        channel,
        handlers: new Set(),
        options,
        scheduler: new PollingScheduler(options.activity ?? 'normal'),
        wsUnsubs: [],
        join: options.join,
        leave: options.leave,
      };
      this.subscriptions.set(channel, sub);
      this.setupSubscription(sub);
    } else {
      sub.options = { ...sub.options, ...options };
      if (options.activity) sub.scheduler.setActivityHint(options.activity);
      if (options.join) sub.join = options.join;
      if (options.leave) sub.leave = options.leave;
    }

    sub.handlers.add(handler);
    return () => this.unsubscribe(channel, handler);
  }

  unsubscribe(channel: string, handler?: RealtimeHandler): void {
    const sub = this.subscriptions.get(channel);
    if (!sub) return;

    if (handler) {
      sub.handlers.delete(handler);
      if (sub.handlers.size > 0) return;
    }

    sub.wsUnsubs.forEach((u) => u());
    if (sub.pollTimer) clearTimeout(sub.pollTimer);
    sub.leave?.();
    this.subscriptions.delete(channel);

    if (this.subscriptions.size === 0) {
      this.stopAllPolling();
    }
  }

  publish(channel: string, payload: unknown): void {
    this.dispatch(channel, { type: 'publish', payload, channel });
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  onReconnect(listener: () => void): () => void {
    this.reconnectListeners.add(listener);
    return () => this.reconnectListeners.delete(listener);
  }

  onDisconnect(listener: () => void): () => void {
    this.disconnectListeners.add(listener);
    return () => this.disconnectListeners.delete(listener);
  }

  onStateChange(listener: () => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  getDiagnostics(): RealtimeDiagnostics {
    const intervals = [...this.subscriptions.values()].map((s) => s.scheduler.getIntervalMs());
    const snapshot = this.diagnosticsSnapshot;
    snapshot.state = this.state;
    snapshot.transport = this.state === 'CONNECTED' || this.state === 'DEGRADED'
      ? 'websocket'
      : this.pollingActive
        ? 'polling'
        : 'none';
    snapshot.pollingIntervalMs = intervals.length ? Math.min(...intervals) : this.lastPollingIntervalMs;
    snapshot.reconnectCount = this.reconnectCount;
    snapshot.subscriptionCount = this.subscriptions.size;
    snapshot.online = this.online;
    return snapshot;
  }

  configureAuth(token: string | null, tenantSlug?: string | null): void {
    this.authToken = token;
    socketTransport.setAuthToken(token);
    if (tenantSlug !== undefined) {
      socketTransport.setTenantSlug(tenantSlug);
    }
    if (this.connectStarted && socketTransport.isConnected()) {
      socketTransport.disconnect();
      socketTransport.connect();
    }
  }

  joinEvent(eventId: string): void {
    socketTransport.joinEvent(eventId);
  }

  joinPickupBoard(eventId: string): void {
    socketTransport.joinPickupBoard(eventId);
  }

  joinOrder(lookupToken: string, lastName?: string): void {
    socketTransport.joinOrder(lookupToken, lastName);
  }

  leaveOrder(orderId: string): void {
    socketTransport.leaveOrder(orderId);
  }

  private attachTransportHandlers(): void {
    if (this.transportUnsubs.length > 0) return;

    this.transportUnsubs.push(
      socketTransport.onConnect(() => {
        this.reconnectCount += 1;
        this.log('WebSocket verbunden');
        this.setState('CONNECTED');
        this.stopAllPolling();
        this.clearWsProbe();
        socketTransport.rejoinEvent();
        for (const sub of this.subscriptions.values()) {
          sub.join?.();
        }
        if (this.connectedOnce) {
          this.log('Reconnect erfolgreich');
          this.reconnectListeners.forEach((l) => l());
        }
        this.connectedOnce = true;
      }),
      socketTransport.onDisconnect(() => {
        this.log('WebSocket getrennt');
        this.disconnectListeners.forEach((l) => l());
        if (!this.online) {
          this.setState('DISCONNECTED');
          return;
        }
        this.enterPollingMode();
      }),
      socketTransport.onReconnectAttempt(() => {
        if (this.state !== 'CONNECTED') {
          this.setState('RECONNECTING');
        }
      })
    );
  }

  private setupSubscription(sub: Subscription): void {
    sub.join?.();

    const wsEvents = sub.options.wsEvents ?? [];
    for (const event of wsEvents) {
      const unsub = socketTransport.subscribe(event, (payload) => {
        this.dispatch(sub.channel, { type: event, payload, channel: sub.channel });
        if (sub.options.pollOnWsEvent !== false && sub.options.poll) {
          void this.runPoll(sub, { fromWs: true });
        }
      });
      sub.wsUnsubs.push(unsub);
    }

    if (sub.options.poll) {
      void this.runPoll(sub, { initial: true });
    }

    if (!socketTransport.isConnected()) {
      this.enterPollingMode();
    }
  }

  private enterPollingMode(): void {
    if (!this.online) {
      this.setState('DISCONNECTED');
      return;
    }
    if (this.state !== 'POLLING') {
      this.log('Polling gestartet');
      this.setState('POLLING');
    }
    this.startAllPolling();
    this.scheduleWsProbe();
  }

  private startAllPolling(): void {
    if (this.pollingActive) return;
    this.pollingActive = true;
    for (const sub of this.subscriptions.values()) {
      if (!sub.pollTimer) void this.runPoll(sub, { initial: true });
    }
  }

  private stopAllPolling(): void {
    if (this.pollingActive) {
      this.log('Polling beendet');
    }
    this.pollingActive = false;
    for (const sub of this.subscriptions.values()) {
      if (sub.pollTimer) {
        clearTimeout(sub.pollTimer);
        sub.pollTimer = undefined;
      }
    }
  }

  private async runPoll(sub: Subscription, opts: { fromWs?: boolean; initial?: boolean } = {}): Promise<void> {
    if (!sub.options.poll) return;

    if (sub.pollTimer) {
      clearTimeout(sub.pollTimer);
      sub.pollTimer = undefined;
    }

    const usePolling = this.pollingActive || !socketTransport.isConnected();
    if (!usePolling && !opts.fromWs && !opts.initial) return;

    try {
      const result = await sub.options.poll(sub.lastEtag);
      if (result.etag) sub.lastEtag = result.etag;

      if (result.changed && result.data !== undefined) {
        sub.scheduler.onDataChanged();
        sub.options.onPollData?.(result.data);
        this.dispatch(sub.channel, { type: 'data', payload: result.data, channel: sub.channel });
      } else {
        sub.scheduler.onPollNoChange();
      }
    } catch {
      if (!this.online) {
        this.setState('DISCONNECTED');
      } else if (socketTransport.isConnected()) {
        this.setState('DEGRADED');
      }
    }

    const shouldContinuePolling = this.pollingActive || !socketTransport.isConnected();
    if (shouldContinuePolling && this.subscriptions.has(sub.channel)) {
      const interval = sub.scheduler.getIntervalMs();
      this.lastPollingIntervalMs = interval;
      this.log(`Polling-Intervall: ${interval}ms (${sub.channel})`);
      sub.pollTimer = setTimeout(() => void this.runPoll(sub, {}), interval);
    }
  }

  private scheduleWsProbe(): void {
    this.clearWsProbe();
    if (!this.online || this.subscriptions.size === 0) return;

    this.wsProbeTimer = setTimeout(async () => {
      if (socketTransport.isConnected()) {
        this.setState('CONNECTED');
        this.stopAllPolling();
        this.scheduleWsProbe();
        return;
      }

      this.setState('RECONNECTING');
      const ok = await socketTransport.probeConnection();
      if (ok) {
        this.log('Reconnect erfolgreich');
        this.reconnectListeners.forEach((l) => l());
        return;
      }

      if (this.pollingActive) this.scheduleWsProbe();
    }, 15_000);
  }

  private clearWsProbe(): void {
    if (this.wsProbeTimer) {
      clearTimeout(this.wsProbeTimer);
      this.wsProbeTimer = undefined;
    }
  }

  private dispatch(channel: string, message: RealtimeMessage): void {
    const sub = this.subscriptions.get(channel);
    if (!sub) return;
    sub.handlers.forEach((h) => h(message));
  }

  private setState(next: ConnectionState): void {
    if (this.state === next) return;
    this.state = next;
    this.stateListeners.forEach((l) => l());
  }

  private log(message: string): void {
    if (import.meta.env.DEV) {
      console.info(`${LOG_PREFIX} ${message}`);
    }
  }

  private handleBrowserOnline = (): void => {
    this.online = true;
    this.log('Online');
    this.connect(this.authToken);
  };

  private handleBrowserOffline = (): void => {
    this.online = false;
    this.log('Offline');
    this.setState('DISCONNECTED');
    this.stopAllPolling();
    this.clearWsProbe();
  };
}

export const realtimeService = new RealtimeServiceImpl();

export type { ActivityLevel, ConnectionState, RealtimeDiagnostics, RealtimeHandler, RealtimeMessage, SubscribeOptions };
