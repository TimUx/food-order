import { prisma } from '../../../config/database';
import { moduleIdFromNamespace } from '../SettingsNamespaces';
import type { SettingsStore } from '../types';
import { tenantModuleRepository } from '../../../repositories/tenantModuleRepository';
import { requireTenantId } from '../../tenant/tenantScope';

export class ModuleSettingsStore implements SettingsStore {
  supports(namespace: string): boolean {
    return moduleIdFromNamespace(namespace) !== null;
  }

  async load(namespace: string): Promise<Record<string, unknown>> {
    const moduleId = moduleIdFromNamespace(namespace);
    if (!moduleId) throw new Error(`Invalid module namespace: ${namespace}`);

    const row = await tenantModuleRepository.findUnique(moduleId);
    const json = (row?.configJson ?? {}) as Record<string, unknown>;
    return structuredClone(json);
  }

  async save(namespace: string, values: Record<string, unknown>): Promise<void> {
    const moduleId = moduleIdFromNamespace(namespace);
    if (!moduleId) throw new Error(`Invalid module namespace: ${namespace}`);

    const existing = await tenantModuleRepository.findUnique(moduleId);
    if (!existing) {
      await tenantModuleRepository.upsert(moduleId, {
        configJson: values as object,
        installed: false,
        enabled: false,
      }, {});
      return;
    }

    await tenantModuleRepository.update(moduleId, {
      configJson: values as object,
    });
  }
}
