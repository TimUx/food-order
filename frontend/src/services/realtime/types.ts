export type ConnectionState =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DEGRADED'
  | 'POLLING'
  | 'RECONNECTING'
  | 'DISCONNECTED';

export type ActivityLevel = 'high' | 'normal' | 'low' | 'idle';

export type RealtimeMessage = {
  type: string;
  payload: unknown;
  channel: string;
};

export type SyncResult<T> = {
  changed: boolean;
  etag: string;
  serverTime: string;
  data?: T;
};

export type PollFn<T = unknown> = (etag?: string) => Promise<SyncResult<T>>;

export type SubscribeOptions<T = unknown> = {
  poll?: PollFn<T>;
  onPollData?: (data: T) => void;
  wsEvents?: string[];
  join?: () => void;
  leave?: () => void;
  activity?: ActivityLevel;
  /** Sofort pollen bei WS-Ereignis (Delta-Abruf) */
  pollOnWsEvent?: boolean;
};

export type RealtimeDiagnostics = {
  state: ConnectionState;
  transport: 'websocket' | 'polling' | 'none';
  pollingIntervalMs: number | null;
  reconnectCount: number;
  subscriptionCount: number;
  online: boolean;
};

export type RealtimeHandler = (message: RealtimeMessage) => void;
