import type { TenantSettingsRecord } from './types';

/**
 * Vorbereitete Schnittstelle für mandantenspezifische Einstellungen (Phase 2+).
 * Vollständige Implementierung folgt mit Migration von ClubSettings.
 */
export interface TenantSettingsService {
  getSettings(tenantId: string): Promise<TenantSettingsRecord>;
  updateSettings(tenantId: string, values: Partial<TenantSettingsRecord>): Promise<TenantSettingsRecord>;
  getNamespaceValues(tenantId: string, namespace: string): Promise<Record<string, unknown>>;
  setNamespaceValues(
    tenantId: string,
    namespace: string,
    values: Record<string, unknown>
  ): Promise<void>;
}

export const TENANT_SETTINGS_NAMESPACES = {
  ORGANIZATION: 'tenant.organization',
  ORDER: 'tenant.order',
  APPEARANCE: 'tenant.appearance',
  module: (moduleId: string) => `tenant.module.${moduleId}`,
} as const;
