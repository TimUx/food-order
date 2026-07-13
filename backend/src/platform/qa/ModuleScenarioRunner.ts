import type { ModuleManager } from '../ModuleManager';
import type { ModuleRegistry } from '../ModuleRegistry';
import type { HealthService } from '../HealthService';
import type { FeatureContext } from '../types';
import type { QaRegistry } from './QaRegistry';
import { tenantModuleRepository } from '../../repositories/tenantModuleRepository';

export interface ModuleScenario {
  id: string;
  label: string;
  activeModuleIds: string[];
}

export interface ModuleScenarioResult {
  scenarioId: string;
  label: string;
  ok: boolean;
  health: Record<string, { status: string; message?: string }>;
  error?: string;
}

/** Erzeugt und führt Modul-Szenarien dynamisch über ModuleDiscovery aus. */
export class ModuleScenarioRunner {
  constructor(
    private readonly qaRegistry: QaRegistry,
    private readonly moduleManager: ModuleManager,
    private readonly moduleRegistry: ModuleRegistry,
    private readonly healthService: HealthService,
    private readonly featureContext: FeatureContext
  ) {}

  buildScenarios(): ModuleScenario[] {
    const moduleIds = this.qaRegistry.scenarioModuleIds();
    const scenarios: ModuleScenario[] = [
      { id: 'none', label: 'Keine Module aktiviert', activeModuleIds: [] },
    ];
    for (const moduleId of moduleIds) {
      scenarios.push({
        id: `only-${moduleId}`,
        label: `Nur ${moduleId}`,
        activeModuleIds: [moduleId],
      });
    }
    scenarios.push({
      id: 'all',
      label: 'Alle offiziellen Module',
      activeModuleIds: moduleIds,
    });
    return scenarios;
  }

  async runScenario(scenario: ModuleScenario): Promise<ModuleScenarioResult> {
    try {
      await this.applyScenario(scenario.activeModuleIds);
      const health = await this.collectHealth();
      const allOk = Object.values(health).every((h) => h.status !== 'unhealthy');
      return {
        scenarioId: scenario.id,
        label: scenario.label,
        ok: allOk,
        health,
      };
    } catch (err) {
      return {
        scenarioId: scenario.id,
        label: scenario.label,
        ok: false,
        health: {},
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async runAll(): Promise<ModuleScenarioResult[]> {
    const results: ModuleScenarioResult[] = [];
    for (const scenario of this.buildScenarios()) {
      results.push(await this.runScenario(scenario));
    }
    return results;
  }

  private async applyScenario(activeIds: string[]): Promise<void> {
    const moduleIds = this.qaRegistry.scenarioModuleIds();

    await this.ensureEntitlements(moduleIds);
    await this.deactivateAllScenarioModules(moduleIds);

    for (const moduleId of moduleIds) {
      const row = await this.moduleRegistry.getDbRow(moduleId);
      if (!row?.installed) {
        await this.moduleManager.installModule(moduleId);
      }
    }

    for (const moduleId of activeIds) {
      await this.activateWithDependencies(moduleId);
    }
  }

  private async ensureEntitlements(moduleIds: string[]): Promise<void> {
    for (const moduleId of moduleIds) {
      await tenantModuleRepository.upsert(
        moduleId,
        { available: true, installed: false, enabled: false },
        { available: true }
      );
    }
  }

  private async deactivateAllScenarioModules(moduleIds: string[]): Promise<void> {
    let progress = true;
    while (progress) {
      progress = false;
      for (const moduleId of moduleIds) {
        const row = await this.moduleRegistry.getDbRow(moduleId);
        if (!row?.enabled) continue;
        try {
          await this.moduleManager.deactivateModule(moduleId);
          progress = true;
        } catch {
          // Abhängiges Modul noch aktiv – in nächster Runde erneut versuchen
        }
      }
    }
  }

  private async activateWithDependencies(moduleId: string): Promise<void> {
    const manifest = this.moduleRegistry.getManifest(moduleId);
    if (!manifest) return;

    for (const depId of manifest.dependencies.required) {
      const depRow = await this.moduleRegistry.getDbRow(depId);
      if (!depRow?.installed) {
        await this.moduleManager.installModule(depId);
      }
      await this.activateWithDependencies(depId);
    }

    const row = await this.moduleRegistry.getDbRow(moduleId);
    if (!row?.enabled) {
      await this.moduleManager.activateModule(moduleId);
    }
  }

  private async collectHealth(): Promise<Record<string, { status: string; message?: string }>> {
    const out: Record<string, { status: string; message?: string }> = {};
    out.core = { status: 'healthy', message: 'Plattform bereit' };

    for (const mod of this.moduleRegistry.getModules()) {
      const row = await this.moduleRegistry.getDbRow(mod.id);
      if (!row?.enabled) continue;
      const result = await this.healthService.checkModule(mod.id, mod, this.featureContext);
      out[mod.id] = { status: result.status, message: result.message };
    }
    return out;
  }
}
