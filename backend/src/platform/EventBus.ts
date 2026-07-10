import { logger } from '../utils/logger';
import type { TenantContext } from './tenant/TenantContext';

export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

export interface EventSubscription {
  id: string;
  event: string;
  handler: EventHandler;
  priority?: number;
  source?: string;
}

export class EventBus {
  private subscriptions = new Map<string, EventSubscription[]>();
  private subscriptionCounter = 0;

  constructor(private readonly tenantContext?: TenantContext) {}

  on<T>(event: string, handler: EventHandler<T>, options?: { priority?: number; source?: string }): string {
    const id = `sub-${++this.subscriptionCounter}`;
    const sub: EventSubscription = {
      id,
      event,
      handler: handler as EventHandler,
      priority: options?.priority ?? 100,
      source: options?.source,
    };
    const existing = this.subscriptions.get(event) ?? [];
    existing.push(sub);
    existing.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
    this.subscriptions.set(event, existing);
    return id;
  }

  off(subscriptionId: string): void {
    for (const [event, subs] of this.subscriptions.entries()) {
      const filtered = subs.filter((s) => s.id !== subscriptionId);
      if (filtered.length !== subs.length) {
        this.subscriptions.set(event, filtered);
        return;
      }
    }
  }

  offSource(source: string): void {
    for (const [event, subs] of this.subscriptions.entries()) {
      this.subscriptions.set(event, subs.filter((s) => s.source !== source));
    }
  }

  async emit<T>(event: string, payload: T): Promise<void> {
    const enriched = this.enrichWithTenantContext(payload);
    const handlers = this.subscriptions.get(event) ?? [];
    const tenantId = this.tenantContext?.id();
    for (const { id, handler, source } of handlers) {
      try {
        await handler(enriched);
      } catch (err) {
        logger.error(`EventBus: handler failed for "${event}" (${source ?? id})`, err, tenantId);
      }
    }
  }

  private enrichWithTenantContext<T>(payload: T): T {
    const tenantId = this.tenantContext?.id();
    if (!tenantId) return payload;
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      return { ...(payload as Record<string, unknown>), tenantId } as T;
    }
    return payload;
  }

  emitAsync<T>(event: string, payload: T): void {
    void this.emit(event, payload);
  }

  listenerCount(event: string): number {
    return this.subscriptions.get(event)?.length ?? 0;
  }

  clear(): void {
    this.subscriptions.clear();
  }
}
