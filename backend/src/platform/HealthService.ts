import type { FeatureContext, Module, ModuleHealthCheckResult } from './types';
import type { FeatureFlags } from './FeatureFlags';
import type { TenantContext } from './tenant/TenantContext';
import { tenantModuleRepository } from '../repositories/tenantModuleRepository';

export interface PlatformHealthStatus {
  tenantContextReady: boolean;
  defaultTenantAvailable: boolean;
  message?: string;
}

export class HealthService {
  constructor(
    private readonly flags: FeatureFlags,
    private readonly tenantContext?: TenantContext
  ) {}

  async checkModule(
    moduleId: string,
    module: Module,
    context: FeatureContext
  ): Promise<ModuleHealthCheckResult> {
    const result = await module.healthCheck(context);
    await this.persist(moduleId, result);
    this.flags.updateHealth(moduleId, result.status);
    return result;
  }

  async persist(moduleId: string, result: ModuleHealthCheckResult): Promise<void> {
    await tenantModuleRepository.update(moduleId, {
      lastHealthStatus: result.status,
      lastHealthCheck: new Date(),
    });
  }

  async checkAll(
    modules: Module[],
    context: FeatureContext
  ): Promise<Record<string, ModuleHealthCheckResult>> {
    const results: Record<string, ModuleHealthCheckResult> = {};
    for (const mod of modules) {
      results[mod.id] = await this.checkModule(mod.id, mod, context);
    }
    return results;
  }

  async checkTenantInfrastructure(
    defaultTenantExists: boolean
  ): Promise<PlatformHealthStatus> {
    const tenantContextReady = this.tenantContext !== undefined;
    const ok = tenantContextReady && defaultTenantExists;
    return {
      tenantContextReady,
      defaultTenantAvailable: defaultTenantExists,
      message: ok
        ? undefined
        : 'Tenant-Infrastruktur ist nicht vollständig initialisiert.',
    };
  }
}
