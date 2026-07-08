import type { ModuleFeatureFlags, ModuleHealthStatus } from './types';

export class FeatureFlags {
  private cache = new Map<string, ModuleFeatureFlags>();

  set(moduleId: string, flags: Partial<ModuleFeatureFlags>): void {
    const current = this.cache.get(moduleId) ?? this.defaultFlags(false);
    this.cache.set(moduleId, { ...current, ...flags });
  }

  get(moduleId: string): ModuleFeatureFlags {
    return this.cache.get(moduleId) ?? this.defaultFlags(false);
  }

  isEnabled(moduleId: string): boolean {
    return this.get(moduleId).enabled;
  }

  isVisible(moduleId: string): boolean {
    const flags = this.get(moduleId);
    return flags.enabled && flags.visible;
  }

  updateHealth(moduleId: string, health: ModuleHealthStatus): void {
    this.set(moduleId, { health });
  }

  defaultFlags(enabled: boolean): ModuleFeatureFlags {
    return {
      enabled,
      disabled: !enabled,
      configurable: true,
      visible: enabled,
      health: 'unknown',
    };
  }

  clear(): void {
    this.cache.clear();
  }
}

export const featureFlags = new FeatureFlags();
