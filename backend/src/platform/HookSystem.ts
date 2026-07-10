import type { EventBus } from './EventBus';
import type { CoreHookName, HookHandler, HookSubscription } from './types';
import { isModuleEnabledForCurrentTenant } from './tenant/tenantModuleHelpers';

/**
 * Domain hook layer on top of EventBus.
 * Core emits hooks; modules subscribe via lifecycle registration.
 * Handler werden nur ausgeführt, wenn das Modul für den aktuellen Mandanten aktiviert ist.
 */
export class HookSystem {
  constructor(private readonly eventBus: EventBus) {}

  subscribe(subscription: HookSubscription): void {
    const handler: HookHandler = async (payload) => {
      if (subscription.moduleId) {
        const enabled = await isModuleEnabledForCurrentTenant(subscription.moduleId);
        if (!enabled) return;
      }
      await subscription.handler(payload);
    };

    this.eventBus.on(subscription.hook, handler, {
      priority: subscription.priority,
      source: subscription.moduleId,
    });
  }

  unsubscribe(moduleId: string): void {
    this.eventBus.offSource(moduleId);
  }

  registerAll(subscriptions: HookSubscription[]): void {
    for (const sub of subscriptions) {
      this.subscribe(sub);
    }
  }

  async emit<T>(hook: CoreHookName, payload: T): Promise<void> {
    await this.eventBus.emit(hook, payload);
  }

  emitAsync<T>(hook: CoreHookName, payload: T): void {
    this.eventBus.emitAsync(hook, payload);
  }

  clear(): void {
    this.eventBus.clear();
  }
}

export type { HookHandler, HookSubscription };
