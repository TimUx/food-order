import { logger } from '../utils/logger';
import type { CoreHookName, HookSubscription } from './types';

export class FeatureHooks {
  private subscriptions = new Map<CoreHookName, HookSubscription[]>();

  subscribe(subscription: HookSubscription): void {
    const existing = this.subscriptions.get(subscription.hook) ?? [];
    existing.push(subscription);
    existing.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
    this.subscriptions.set(subscription.hook, existing);
  }

  unsubscribe(moduleId: string): void {
    for (const [hook, subs] of this.subscriptions.entries()) {
      this.subscriptions.set(hook, subs.filter((s) => s.moduleId !== moduleId));
    }
  }

  registerAll(subscriptions: HookSubscription[]): void {
    for (const sub of subscriptions) {
      this.subscribe(sub);
    }
  }

  async emit<T>(hook: CoreHookName, payload: T): Promise<void> {
    const handlers = this.subscriptions.get(hook) ?? [];
    for (const { moduleId, handler } of handlers) {
      try {
        await handler(payload);
      } catch (err) {
        logger.error(`Hook ${hook} handler failed for module ${moduleId}`, err);
      }
    }
  }

  emitAsync<T>(hook: CoreHookName, payload: T): void {
    void this.emit(hook, payload);
  }

  clear(): void {
    this.subscriptions.clear();
  }
}

export const featureHooks = new FeatureHooks();
