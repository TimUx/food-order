import type { AuditService } from './AuditService';
import type { FeatureFlags } from './FeatureFlags';
import type { HookSystem } from './HookSystem';
import type { SettingsService } from './settings/SettingsService';
import type { TenantContext } from './tenant/TenantContext';
import type { FeatureContext } from './types';
import { moduleSettingsNamespace } from './settings/SettingsNamespaces';

export function createFeatureContext(
  hooks: HookSystem,
  flags: FeatureFlags,
  audit: AuditService,
  settings: SettingsService,
  tenantContext?: TenantContext
): FeatureContext {
  return {
    hooks,
    flags,
    audit,
    settings,

    getTenantId(): string {
      return tenantContext?.id() ?? '';
    },

    hasTenant(): boolean {
      return tenantContext?.exists() ?? false;
    },

    async getConfig<T = Record<string, unknown>>(moduleId: string): Promise<T> {
      return settings.getDecryptedValues(moduleSettingsNamespace(moduleId)) as Promise<T>;
    },

    async setConfig<T = Record<string, unknown>>(moduleId: string, config: T): Promise<void> {
      await settings.setValues(moduleSettingsNamespace(moduleId), config as Record<string, unknown>, {
        partial: false,
      });
    },
  };
}
