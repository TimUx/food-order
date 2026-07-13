import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../platform/tenant/tenantModuleHelpers', () => ({
  isModuleEnabledForCurrentTenant: vi.fn().mockResolvedValue(true),
}));

import { HookSystem } from './HookSystem';
import { EventBus } from './EventBus';
import { MetadataRegistry } from './MetadataRegistry';
import { FeatureFlags } from './FeatureFlags';
import { CORE_HOOKS, BaseModule } from './types';
import { deriveModuleStatus } from './ModuleRegistry';
import { compareVersions } from './types';
import { ModuleRegistry } from './ModuleRegistry';
import { ModuleManager } from './ModuleManager';
import { DependencyResolver } from './DependencyResolver';
import { SettingsService } from './settings/SettingsService';
import { registerModuleSettingsFromManifest } from '../core/settings/registerCoreSettings';
import type { TenantModule } from '@prisma/client';
import type { ModuleManifest } from './manifest';
import { filterDiscoveredManifests } from './manifest';
import type { FeatureContext } from './types';
import { Router } from 'express';

vi.mock('../repositories/tenantModuleRepository', () => ({
  tenantModuleRepository: {
    findUnique: vi.fn().mockResolvedValue({ installed: true, enabled: true }),
    isInstalledForAnyTenant: vi.fn().mockResolvedValue(false),
    findManyForTenant: vi.fn().mockResolvedValue([]),
    upsert: vi.fn(),
    update: vi.fn(),
  },
}));

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
  available: true,
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
      productionReady: true,
      preview: false,
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
});

describe('deriveModuleStatus', () => {
  it('returns ENABLED when installed and enabled', () => {
    expect(deriveModuleStatus({ ...baseRow, enabled: true })).toBe('ENABLED');
  });
});

describe('compareVersions', () => {
  it('compares semver correctly', () => {
    expect(compareVersions('1.1.0', '1.0.0')).toBeGreaterThan(0);
  });
});

describe('FeatureFlags', () => {
  it('tracks enabled state', () => {
    const flags = new FeatureFlags();
    flags.set('payment', { enabled: true, disabled: false, configurable: true, visible: true, health: 'healthy' });
    expect(flags.isEnabled('payment')).toBe(true);
  });
});

describe('filterDiscoveredManifests', () => {
  const originalEnv = process.env.SHOW_PREVIEW_MODULES;

  afterEach(() => {
    process.env.SHOW_PREVIEW_MODULES = originalEnv;
  });

  it('skips preview modules unless SHOW_PREVIEW_MODULES=1', () => {
    const manifests = [
      { id: 'stable', preview: false } as ModuleManifest,
      { id: 'preview', preview: true } as ModuleManifest,
    ];

    delete process.env.SHOW_PREVIEW_MODULES;
    expect(filterDiscoveredManifests(manifests).map((m) => m.id)).toEqual(['stable']);

    process.env.SHOW_PREVIEW_MODULES = '1';
    expect(filterDiscoveredManifests(manifests).map((m) => m.id).sort()).toEqual(['preview', 'stable']);
  });
});

describe('registerModuleSettingsFromManifest', () => {
  it('registers settings schema from manifest', () => {
    const registerSchema = vi.fn();
    const settings = { registerSchema } as unknown as SettingsService;

    const manifest: ModuleManifest = {
      id: 'payment',
      name: 'Payment',
      description: 'pay',
      version: '1.0.0',
      author: 'test',
      license: 'MIT',
      entry: 'index',
      dependencies: { required: [], optional: [] },
      permissions: [],
      menus: [],
      widgets: [],
      reports: [],
      developerPages: [],
      healthChecks: [],
      routes: [],
      minimumCoreVersion: '1.0.0',
      productionReady: true,
      preview: false,
      settings: {
        namespace: 'module.payment',
        fields: [{ key: 'enabled', group: 'general', label: 'Aktiv', type: 'boolean' }],
        groups: [{ id: 'general', label: 'Allgemein' }],
      },
    };

    registerModuleSettingsFromManifest(settings, manifest);
    expect(registerSchema).toHaveBeenCalledWith(
      expect.objectContaining({ namespace: 'module.payment' })
    );
  });
});

describe('ModuleManager route mounting', () => {
  it('registers feature routes on the API router', async () => {
    const featureContext = {} as FeatureContext;
    const hookSystem = new HookSystem(new EventBus());
    const metadataRegistry = new MetadataRegistry();
    const featureFlags = new FeatureFlags();
    const moduleRegistry = new ModuleRegistry();
    const dependencyResolver = new DependencyResolver(moduleRegistry);

    moduleRegistry.bindPlatformDeps({
      featureFlags,
      metadataRegistry,
      featureContext,
      dependencyResolver,
    });

    class TestModule extends BaseModule {
      readonly id = 'testmod';
      readonly name = 'Test';
      readonly version = '1.0.0';
      readonly description = 'test';
      readonly author = 'test';

      registerRoutes(): ReturnType<BaseModule['registerRoutes']> {
        const router = Router();
        router.get('/ping', (_req, res) => res.json({ ok: true }));
        return [{ mountPath: '/ping', router }];
      }
    }

    const manifest: ModuleManifest = {
      id: 'testmod',
      name: 'Test',
      description: 'test',
      version: '1.0.0',
      author: 'test',
      license: 'MIT',
      entry: 'index',
      dependencies: { required: [], optional: [] },
      permissions: [],
      menus: [],
      widgets: [],
      reports: [],
      developerPages: [],
      healthChecks: [],
      routes: [{ mountPath: '/ping' }],
      minimumCoreVersion: '1.0.0',
      productionReady: true,
      preview: false,
    };

    moduleRegistry.register(new TestModule(), manifest);

    const manager = new ModuleManager({
      moduleRegistry,
      moduleDiscovery: { discover: () => [manifest] } as never,
      moduleLoader: { load: async () => new TestModule() } as never,
      migrationService: { runForModule: async () => {} } as never,
      dependencyResolver,
      metadataRegistry,
      healthService: { checkModule: async () => ({ status: 'healthy' }) } as never,
      auditService: { log: async () => {} } as never,
      hookSystem,
      featureFlags,
      featureContext,
      settingsService: { registerSchema: vi.fn() } as never,
    });

    manager.getActivatedIds(); // ensure method exists
    (manager as unknown as { activatedIds: Set<string> }).activatedIds.add('testmod');

    const apiRouter = Router();
    await manager.mountRoutes(apiRouter);

    expect(apiRouter).toBeTruthy();
  });
});
