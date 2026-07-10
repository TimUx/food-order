import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../platform/tenant/tenantModuleHelpers', () => ({
  isModuleEnabledForCurrentTenant: vi.fn().mockResolvedValue(true),
}));

import { HookSystem } from '../platform/HookSystem';
import { EventBus } from '../platform/EventBus';
import { MetadataRegistry } from '../platform/MetadataRegistry';
import { FeatureFlags } from '../platform/FeatureFlags';
import { CORE_HOOKS } from '../platform/types';
import { deriveModuleStatus } from '../platform/ModuleRegistry';
import { compareVersions } from '../platform/types';
import type { TenantModule } from '@prisma/client';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000010';

const baseRow = {
  tenantId: DEFAULT_TENANT_ID,
  moduleId: 'payment',
  moduleVersion: '1.0.0',
  installed: true,
  enabled: true,
  installedAt: new Date(),
  updatedAt: new Date(),
  configJson: {},
  lastHealthStatus: null,
  lastHealthCheck: null,
  everInstalled: true,
  everActivated: true,
  lifecycleStatus: null,
  lastError: null,
  schemaVersion: '0',
  imageVersion: '1.0.0',
} as TenantModule;

describe('HookSystem', () => {
  let hooks: HookSystem;

  beforeEach(() => {
    hooks = new HookSystem(new EventBus());
  });

  it('emits events to subscribed handlers', async () => {
    const received: unknown[] = [];
    hooks.subscribe({
      moduleId: 'test',
      hook: CORE_HOOKS.ORDER_CREATED,
      handler: (payload) => { received.push(payload); },
    });

    await hooks.emit(CORE_HOOKS.ORDER_CREATED, { id: 'order-1' });
    expect(received).toHaveLength(1);
  });

  it('unsubscribes all handlers for a module', async () => {
    const received: unknown[] = [];
    hooks.subscribe({
      moduleId: 'test',
      hook: CORE_HOOKS.ORDER_CREATED,
      handler: (payload) => { received.push(payload); },
    });

    hooks.unsubscribe('test');
    await hooks.emit(CORE_HOOKS.ORDER_CREATED, { id: 'order-1' });
    expect(received).toHaveLength(0);
  });
});

describe('MetadataRegistry', () => {
  it('prefers manifest menus over runtime registration', () => {
    const registry = new MetadataRegistry();
    const manifest = {
      id: 'payment',
      name: 'Payment',
      description: '',
      version: '1.0.0',
      author: 'test',
      license: 'MIT',
      entry: 'index',
      dependencies: { required: [], optional: [] },
      permissions: [],
      menus: [{ id: 'm1', label: 'From Manifest', path: '/x' }],
      widgets: [],
      reports: [],
      developerPages: [],
      healthChecks: [],
      routes: [],
      minimumCoreVersion: '1.0.0',
    };
    const mod = {
      id: 'payment',
      name: 'Payment',
      version: '1.0.0',
      description: '',
      author: 'test',
      install: async () => {},
      uninstall: async () => {},
      initialize: async () => {},
      shutdown: async () => {},
      enable: async () => {},
      disable: async () => {},
      upgrade: async () => {},
      healthCheck: async () => ({ status: 'unknown' as const }),
      registerRoutes: () => [],
      registerHooks: () => [],
      registerPermissions: () => [],
      registerMenus: () => [{ id: 'm2', label: 'From Code', path: '/y' }],
      registerWidgets: () => [],
    };

    const meta = registry.resolve(manifest, mod, true, {} as never);
    expect(meta.menus).toHaveLength(1);
    expect(meta.menus[0].label).toBe('From Manifest');
  });

  it('aggregates permissions from all modules, menus only from active', () => {
    const registry = new MetadataRegistry();
    const manifest = (id: string) => ({
      id,
      name: id,
      description: '',
      version: '1.0.0',
      author: 'test',
      license: 'MIT',
      entry: 'index',
      dependencies: { required: [], optional: [] },
      permissions: [{ key: `${id}.view`, description: 'view' }],
      menus: [{ id: `${id}-menu`, label: id, path: `/${id}` }],
      widgets: [],
      reports: [],
      developerPages: [],
      healthChecks: [],
      routes: [],
      minimumCoreVersion: '1.0.0',
    });
    const mod = (id: string) => ({
      id,
      name: id,
      version: '1.0.0',
      description: '',
      author: 'test',
      install: async () => {},
      uninstall: async () => {},
      initialize: async () => {},
      shutdown: async () => {},
      enable: async () => {},
      disable: async () => {},
      upgrade: async () => {},
      healthCheck: async () => ({ status: 'unknown' as const }),
      registerRoutes: () => [],
      registerHooks: () => [],
      registerPermissions: () => [],
      registerMenus: () => [],
      registerWidgets: () => [],
    });

    registry.resolve(manifest('payment'), mod('payment'), true, {} as never);
    registry.resolve(manifest('inventory'), mod('inventory'), false, {} as never);

    const aggregated = registry.aggregate(new Set(['payment']));
    expect(aggregated.menus).toHaveLength(1);
    expect(aggregated.permissions).toHaveLength(1);
    expect(aggregated.permissions[0].key).toBe('payment.view');
  });
});

describe('deriveModuleStatus', () => {
  it('returns AVAILABLE when not installed', () => {
    expect(deriveModuleStatus(null)).toBe('AVAILABLE');
  });

  it('returns ENABLED when installed and enabled', () => {
    expect(deriveModuleStatus({
      ...baseRow,
      enabled: true,
    })).toBe('ENABLED');
  });

  it('returns UPGRADING when lifecycle status is UPGRADING', () => {
    expect(deriveModuleStatus({
      ...baseRow,
      lifecycleStatus: 'UPGRADING',
      imageVersion: '1.1.0',
    })).toBe('UPGRADING');
  });

  it('returns FAILED when lifecycle status is FAILED', () => {
    expect(deriveModuleStatus({
      ...baseRow,
      enabled: false,
      everActivated: false,
      lifecycleStatus: 'FAILED',
      lastError: 'Test error',
    })).toBe('FAILED');
  });

  it('returns DISABLED when installed but deactivated', () => {
    expect(deriveModuleStatus({
      ...baseRow,
      enabled: false,
    })).toBe('DISABLED');
  });
});

describe('compareVersions', () => {
  it('compares semver correctly', () => {
    expect(compareVersions('1.1.0', '1.0.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });
});

describe('FeatureFlags', () => {
  it('tracks enabled state', () => {
    const flags = new FeatureFlags();
    flags.set('payment', { enabled: true, disabled: false, configurable: true, visible: true, health: 'healthy' });
    expect(flags.isEnabled('payment')).toBe(true);
  });
});
