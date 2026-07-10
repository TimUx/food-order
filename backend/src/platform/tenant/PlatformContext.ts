import { AsyncLocalStorage } from 'node:async_hooks';
import type { PlatformContextData } from './types';
import { DEFAULT_PLATFORM_CONTEXT } from './types';
import { PlatformConfigMissingError } from './errors';

export class PlatformContext {
  private readonly storage = new AsyncLocalStorage<PlatformContextData>();
  private bootData: PlatformContextData = { ...DEFAULT_PLATFORM_CONTEXT };

  initialize(data: PlatformContextData): void {
    this.bootData = { ...data };
  }

  getBootData(): PlatformContextData {
    return this.bootData;
  }

  run<T>(data: PlatformContextData, fn: () => T): T {
    return this.storage.run(data, fn);
  }

  async runAsync<T>(data: PlatformContextData, fn: () => Promise<T>): Promise<T> {
    return this.storage.run(data, fn);
  }

  current(): PlatformContextData {
    return this.storage.getStore() ?? this.bootData;
  }

  platformName(): string {
    return this.current().platformName;
  }

  platformVersion(): string {
    return this.current().platformVersion;
  }

  baseDomain(): string {
    return this.current().baseDomain;
  }

  settings(): PlatformContextData {
    return this.current();
  }

  isMaintenanceMode(): boolean {
    return this.current().maintenanceMode;
  }

  require(): PlatformContextData {
    const ctx = this.current();
    if (!ctx.baseDomain) {
      throw new PlatformConfigMissingError();
    }
    return ctx;
  }

  set(data: PlatformContextData): void {
    this.storage.enterWith(data);
  }

  clear(): void {
    this.storage.disable();
  }
}
