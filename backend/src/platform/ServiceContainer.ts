/**
 * Lightweight dependency injection container for the platform core.
 */
export type ServiceFactory<T> = () => T;

export class ServiceContainer {
  private readonly singletons = new Map<symbol, unknown>();
  private readonly factories = new Map<symbol, ServiceFactory<unknown>>();

  registerSingleton<T>(token: symbol, instance: T): void {
    this.singletons.set(token, instance);
    this.factories.delete(token);
  }

  registerFactory<T>(token: symbol, factory: ServiceFactory<T>): void {
    this.factories.set(token, factory as ServiceFactory<unknown>);
    this.singletons.delete(token);
  }

  get<T>(token: symbol): T {
    if (this.singletons.has(token)) {
      return this.singletons.get(token) as T;
    }
    const factory = this.factories.get(token);
    if (!factory) {
      throw new Error(`Service not registered: ${token.toString()}`);
    }
    const instance = factory();
    this.singletons.set(token, instance);
    return instance as T;
  }

  has(token: symbol): boolean {
    return this.singletons.has(token) || this.factories.has(token);
  }

  clear(): void {
    this.singletons.clear();
    this.factories.clear();
  }
}

export const PLATFORM_TOKENS = {
  EventBus: Symbol('platform.EventBus'),
  HookSystem: Symbol('platform.HookSystem'),
  MetadataRegistry: Symbol('platform.MetadataRegistry'),
  ExtensionPointRegistry: Symbol('platform.ExtensionPointRegistry'),
  HealthService: Symbol('platform.HealthService'),
  AuditService: Symbol('platform.AuditService'),
  ModuleRegistry: Symbol('platform.ModuleRegistry'),
  ModuleManager: Symbol('platform.ModuleManager'),
  FeatureContext: Symbol('platform.FeatureContext'),
  FeatureFlags: Symbol('platform.FeatureFlags'),
  SettingsService: Symbol('platform.SettingsService'),
  TenantService: Symbol('platform.TenantService'),
  TenantContext: Symbol('platform.TenantContext'),
  TenantResolver: Symbol('platform.TenantResolver'),
  PlatformContext: Symbol('platform.PlatformContext'),
  PlatformSettingsService: Symbol('platform.PlatformSettingsService'),
  TenantSettingsService: Symbol('platform.TenantSettingsService'),
} as const;
