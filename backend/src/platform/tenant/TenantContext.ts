import { AsyncLocalStorage } from 'node:async_hooks';
import type { TenantContextData, TenantSettingsRecord } from './types';
import { DEFAULT_TENANT_SETTINGS } from './types';
import { TenantContextMissingError } from './errors';

export class TenantContext {
  private readonly storage = new AsyncLocalStorage<TenantContextData>();

  run<T>(data: TenantContextData, fn: () => T): T {
    return this.storage.run(data, fn);
  }

  async runAsync<T>(data: TenantContextData, fn: () => Promise<T>): Promise<T> {
    return this.storage.run(data, fn);
  }

  current(): TenantContextData | undefined {
    return this.storage.getStore();
  }

  id(): string | undefined {
    return this.current()?.id;
  }

  name(): string | undefined {
    return this.current()?.name;
  }

  slug(): string | undefined {
    return this.current()?.slug;
  }

  subdomain(): string | undefined {
    return this.current()?.subdomain;
  }

  settings(): TenantSettingsRecord {
    return this.current()?.settings ?? DEFAULT_TENANT_SETTINGS;
  }

  exists(): boolean {
    return this.current() !== undefined;
  }

  require(): TenantContextData {
    const ctx = this.current();
    if (!ctx) {
      throw new TenantContextMissingError();
    }
    return ctx;
  }

  set(data: TenantContextData): void {
    this.storage.enterWith(data);
  }

  clear(): void {
    this.storage.disable();
  }
}
