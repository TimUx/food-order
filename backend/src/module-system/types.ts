import type { Router } from 'express';
import type { ZodType } from 'zod';
import type { ModuleManifest, ModuleStatus } from './manifest';

export type ModuleHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ModuleFeatureFlags {
  enabled: boolean;
  disabled: boolean;
  configurable: boolean;
  visible: boolean;
  health: ModuleHealthStatus;
}

export interface ModulePermissionDefinition {
  key: string;
  description: string;
}

export interface ModuleMenuItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  parentId?: string;
  sortOrder?: number;
  requiredPermission?: string;
}

export interface ModuleWidget {
  id: string;
  title: string;
  componentId: string;
  sortOrder?: number;
  moduleId?: string;
}

export interface ModuleRouteRegistration {
  path: string;
  router: Router;
  mountPath?: string;
  isWebhook?: boolean;
}

export interface ModuleHealthCheckResult {
  status: ModuleHealthStatus;
  message?: string;
  details?: Record<string, unknown>;
}

export interface ModuleInfo {
  id: string;
  name: string;
  version: string;
  imageVersion: string;
  description: string;
  author: string;
  homepage?: string;
  license: string;
  status: ModuleStatus;
  installed: boolean;
  enabled: boolean;
  flags: ModuleFeatureFlags;
  permissions: ModulePermissionDefinition[];
  menuItems: ModuleMenuItem[];
  widgets: ModuleWidget[];
  hasConfig: boolean;
  dependencies: ModuleManifest['dependencies'];
  minimumCoreVersion: string;
  installedAt?: string;
  lastHealthStatus?: string;
  lastHealthCheck?: string;
  upgradeAvailable: boolean;
}

export const CORE_HOOKS = {
  ORDER_CREATED: 'onOrderCreated',
  ORDER_PAID: 'onOrderPaid',
  ORDER_CANCELLED: 'onOrderCancelled',
  ORDER_STATUS_CHANGED: 'onOrderStatusChanged',
  KITCHEN_COMPLETED: 'onKitchenCompleted',
  USER_LOGIN: 'onUserLogin',
  EVENT_CREATED: 'onEventCreated',
  EVENT_UPDATED: 'onEventUpdated',
  SETTINGS_CHANGED: 'onSettingsChanged',
} as const;

export type CoreHookName = (typeof CORE_HOOKS)[keyof typeof CORE_HOOKS];
export type HookHandler<T = unknown> = (payload: T) => void | Promise<void>;

export interface HookSubscription {
  moduleId: string;
  hook: CoreHookName;
  handler: HookHandler;
  priority?: number;
}

export interface ModuleConfigContract<T = Record<string, unknown>> {
  defaults: T;
  schema: ZodType<T>;
}

export interface FeatureContext {
  readonly hooks: import('./FeatureHooks').FeatureHooks;
  readonly flags: import('./FeatureFlags').FeatureFlags;
  getConfig<T = Record<string, unknown>>(moduleId: string): Promise<T>;
  setConfig<T = Record<string, unknown>>(moduleId: string, config: T): Promise<void>;
}

export interface Module {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;

  install(context: FeatureContext): Promise<void>;
  uninstall(context: FeatureContext): Promise<void>;
  initialize(context: FeatureContext): Promise<void>;
  shutdown(context: FeatureContext): Promise<void>;
  enable(context: FeatureContext): Promise<void>;
  disable(context: FeatureContext): Promise<void>;
  upgrade(context: FeatureContext, fromVersion: string, toVersion: string): Promise<void>;
  healthCheck(context: FeatureContext): Promise<ModuleHealthCheckResult>;

  registerRoutes(context: FeatureContext): ModuleRouteRegistration[];
  registerHooks(context: FeatureContext): HookSubscription[];
  registerPermissions(context: FeatureContext): ModulePermissionDefinition[];
  registerMenus(context: FeatureContext): ModuleMenuItem[];
  registerWidgets(context: FeatureContext): ModuleWidget[];

  getConfigContract?(): ModuleConfigContract;

  /** @deprecated use registerMenus */
  registerMenu?(context: FeatureContext): ModuleMenuItem[];
}

export abstract class BaseModule implements Module {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly description: string;
  abstract readonly author: string;

  async install(_context: FeatureContext): Promise<void> {}
  async uninstall(_context: FeatureContext): Promise<void> {}
  async initialize(_context: FeatureContext): Promise<void> {}
  async shutdown(_context: FeatureContext): Promise<void> {}
  async enable(_context: FeatureContext): Promise<void> {}
  async disable(_context: FeatureContext): Promise<void> {}
  async upgrade(_context: FeatureContext, _from: string, _to: string): Promise<void> {}

  registerRoutes(_context: FeatureContext): ModuleRouteRegistration[] {
    return [];
  }

  registerMenus(_context: FeatureContext): ModuleMenuItem[] {
    return [];
  }

  registerWidgets(_context: FeatureContext): ModuleWidget[] {
    return [];
  }

  registerPermissions(_context: FeatureContext): ModulePermissionDefinition[] {
    return [];
  }

  registerHooks(_context: FeatureContext): HookSubscription[] {
    return [];
  }

  async healthCheck(_context: FeatureContext): Promise<ModuleHealthCheckResult> {
    return { status: 'unknown', message: 'Kein Health Check definiert' };
  }
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
