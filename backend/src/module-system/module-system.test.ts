import { describe, it, expect, beforeEach } from 'vitest';
import { FeatureHooks } from './FeatureHooks';
import { FeatureFlags } from './FeatureFlags';
import { CORE_HOOKS } from './types';
import { deriveModuleStatus } from './ModuleRegistry';
import { compareVersions } from './types';

describe('FeatureHooks', () => {
  let hooks: FeatureHooks;

  beforeEach(() => {
    hooks = new FeatureHooks();
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

describe('deriveModuleStatus', () => {
  it('returns AVAILABLE when not installed', () => {
    expect(deriveModuleStatus(null)).toBe('AVAILABLE');
  });

  it('returns ACTIVATED when installed and enabled', () => {
    expect(deriveModuleStatus({
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
    })).toBe('ACTIVATED');
  });

  it('returns DISABLED when installed but deactivated', () => {
    expect(deriveModuleStatus({
      moduleId: 'payment',
      moduleVersion: '1.0.0',
      installed: true,
      enabled: false,
      installedAt: new Date(),
      updatedAt: new Date(),
      configJson: {},
      lastHealthStatus: null,
      lastHealthCheck: null,
      everInstalled: true,
      everActivated: true,
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
