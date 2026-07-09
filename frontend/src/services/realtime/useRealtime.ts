import { useEffect, useRef } from 'react';
import { useSyncExternalStore } from 'react';
import { realtimeService } from './RealtimeService';
import type { ConnectionState, PollFn, SubscribeOptions } from './types';

export { realtimeService };
export type { ActivityLevel, ConnectionState, RealtimeDiagnostics, RealtimeMessage } from './types';

export function useRealtimeConnectionState(): ConnectionState {
  return useSyncExternalStore(
    (listener) => realtimeService.onStateChange(listener),
    () => realtimeService.getConnectionState(),
    () => 'CONNECTED' as ConnectionState
  );
}

export function useRealtimeDiagnostics() {
  return useSyncExternalStore(
    (listener) => realtimeService.onStateChange(listener),
    () => realtimeService.getDiagnostics(),
    () => realtimeService.getDiagnostics()
  );
}

export function useRealtimeChannel<T>(
  channel: string | null,
  options: SubscribeOptions<T> & {
    enabled?: boolean;
    poll?: PollFn<T>;
    onMessage?: (type: string, payload: unknown) => void;
  }
): ConnectionState {
  const state = useRealtimeConnectionState();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!channel || options.enabled === false) return;

    const { onMessage, poll, ...rest } = optionsRef.current;
    return realtimeService.subscribe(
      channel,
      (msg) => onMessage?.(msg.type, msg.payload),
      { ...rest, poll } as SubscribeOptions<unknown>
    );
  }, [channel, options.enabled, options.activity]);

  return state;
}
