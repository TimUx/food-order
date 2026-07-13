import type { SettingsService } from '../../platform/settings/SettingsService';
import type { ModuleManifest } from '../../platform/manifest';
import type { ModuleConfigContract } from '../../platform/types';
import { moduleSettingsNamespace } from '../../platform/settings/SettingsNamespaces';
import type { SettingsSchemaDefinition } from '../../platform/settings/types';
import { CORE_SETTINGS_SCHEMAS } from './schemas';

export function registerCoreSettings(settingsService: SettingsService): void {
  for (const schema of CORE_SETTINGS_SCHEMAS) {
    settingsService.registerSchema(schema);
  }
}

export function registerModuleSettingsFromManifest(
  settingsService: SettingsService,
  manifest: ModuleManifest
): void {
  const settings = manifest.settings;
  if (!settings?.fields?.length) return;

  const namespace = settings.namespace ?? moduleSettingsNamespace(manifest.id);
  const definition: SettingsSchemaDefinition = {
    namespace,
    label: settings.label ?? manifest.name,
    description: settings.description ?? manifest.description,
    permission: settings.permission,
    adminPath: settings.adminPath ?? `/admin/settings/${namespace}`,
    groups: settings.groups ?? [{ id: 'general', label: 'Allgemein' }],
    fields: settings.fields,
  };

  settingsService.registerSchema(definition);
}

/** Fallback fuer Module mit getConfigContract(), aber ohne settings-Block in module.json. */
export function registerModuleSettingsFromContract(
  settingsService: SettingsService,
  moduleId: string,
  manifest: ModuleManifest,
  contract: ModuleConfigContract
): void {
  const namespace = moduleSettingsNamespace(moduleId);
  const defaults = contract.defaults as Record<string, unknown>;
  const fields = Object.entries(defaults).map(([key, value]) => ({
    key,
    group: 'general',
    label: key,
    type: typeof value === 'boolean' ? 'boolean' as const : 'string' as const,
    default: value,
  }));

  settingsService.registerSchema({
    namespace,
    label: manifest.name,
    description: manifest.description,
    adminPath: `/admin/settings/${namespace}`,
    groups: [{ id: 'general', label: 'Allgemein' }],
    fields,
  });
}
