import { Router, RequestHandler } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { tenantModuleRepository } from '../repositories/tenantModuleRepository';
import type { AuditService } from './AuditService';
import type { DependencyResolver } from './DependencyResolver';
import type { FeatureContext } from './types';
import type { FeatureFlags } from './FeatureFlags';
import type { HealthService } from './HealthService';
import type { HookSystem } from './HookSystem';
import type { MetadataRegistry } from './MetadataRegistry';
import type { ModuleDiscovery } from './ModuleDiscovery';
import type { ModuleLoader } from './ModuleLoader';
import type { ModuleRegistry } from './ModuleRegistry';
import { compareVersions, CORE_HOOKS } from './types';
import type { SettingsService } from './settings/SettingsService';
import { registerModuleSettingsFromManifest } from '../core/settings/registerCoreSettings';
import { ModuleMigrationService } from './ModuleMigrationService';
import { requirePermission } from '../middleware/permission';

export interface ModuleManagerDeps {
  moduleRegistry: ModuleRegistry;
  moduleDiscovery: ModuleDiscovery;
  moduleLoader: ModuleLoader;
  migrationService: ModuleMigrationService;
  dependencyResolver: DependencyResolver;
  metadataRegistry: MetadataRegistry;
  healthService: HealthService;
  auditService: AuditService;
  hookSystem: HookSystem;
  featureFlags: FeatureFlags;
  featureContext: FeatureContext;
  settingsService: SettingsService;
}

export class ModuleManager {
  private initialized = false;
  private moduleRouter: Router | null = null;
  private readonly activatedIds = new Set<string>();
  private readonly mountedRouteKeys = new Set<string>();

  constructor(private readonly deps: ModuleManagerDeps) {}

  private routeMountKey(moduleId: string, mountPath: string): string {
    return `${moduleId}:${mountPath}`;
  }

  private async setLifecycleStatus(moduleId: string, status: string | null): Promise<void> {
    await tenantModuleRepository.update(moduleId, { lifecycleStatus: status });
  }

  private async setLastError(moduleId: string, message: string): Promise<void> {
    await tenantModuleRepository.update(moduleId, {
      lastError: message,
      lifecycleStatus: 'FAILED',
    });
  }

  private async clearLifecycleError(moduleId: string): Promise<void> {
    await tenantModuleRepository.update(moduleId, {
      lastError: null,
      lifecycleStatus: null,
    });
  }

  private errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }

  async discoverAndRegister(): Promise<void> {
    const manifests = this.deps.moduleDiscovery.discover();

    for (const manifest of manifests) {
      if (!this.deps.moduleRegistry.satisfiesCoreVersion(manifest)) {
        logger.warn(
          `Modul ${manifest.id} benötigt Core ${manifest.minimumCoreVersion}, aktuell ${config.coreVersion}`
        );
        continue;
      }

      const mod = await this.deps.moduleLoader.load(manifest);
      this.deps.moduleRegistry.register(mod, manifest);
      registerModuleSettingsFromManifest(this.deps.settingsService, manifest);
      await this.ensureDbRow(manifest.id, manifest.version);
      logger.info(`Modul registriert: ${manifest.id} v${manifest.version}`);
    }
  }

  private async ensureDbRow(moduleId: string, version: string): Promise<void> {
    await tenantModuleRepository.upsert(
      moduleId,
      {
        moduleVersion: version,
        imageVersion: version,
        installed: false,
        enabled: false,
      },
      { imageVersion: version }
    );
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.discoverAndRegister();
    await this.logAvailableUpgrades();

    for (const mod of this.deps.moduleRegistry.getModules()) {
      if (this.activatedIds.has(mod.id)) continue;
      if (await tenantModuleRepository.isEnabledForAnyTenant(mod.id)) {
        await this.activateModuleInternal(mod.id, false);
      }
    }

    await this.refreshExtensionPoints();
    this.initialized = true;
    logger.info('Plattform initialisiert');
  }

  private async logAvailableUpgrades(): Promise<void> {
    const { moduleRegistry } = this.deps;

    for (const manifest of moduleRegistry.getAllManifests()) {
      const row = await moduleRegistry.getDbRow(manifest.id);
      if (!row?.installed) continue;

      if (compareVersions(manifest.version, row.moduleVersion) > 0) {
        logger.info(
          `Upgrade verfügbar: ${manifest.id} ${row.moduleVersion} → ${manifest.version} (Admin oder upgrade())`
        );
      }
    }
  }

  async upgradeModule(moduleId: string): Promise<void> {
    const { moduleRegistry, featureContext, auditService, hookSystem, featureFlags, migrationService } = this.deps;
    const mod = moduleRegistry.getModule(moduleId);
    const manifest = moduleRegistry.getManifest(moduleId);
    if (!mod || !manifest) throw new AppError(404, 'Modul nicht gefunden');

    const row = await moduleRegistry.getDbRow(moduleId);
    if (!row?.installed) throw new AppError(400, 'Modul muss installiert sein');

    const fromVersion = row.moduleVersion;
    const toVersion = manifest.version;

    if (compareVersions(toVersion, fromVersion) <= 0) {
      throw new AppError(400, 'Kein Upgrade verfügbar');
    }

    const wasEnabled = row.enabled;
    await this.setLifecycleStatus(moduleId, 'UPGRADING');

    try {
      if (wasEnabled) {
        await mod.disable(featureContext);
        await mod.shutdown(featureContext);
        hookSystem.unsubscribe(moduleId);
        this.activatedIds.delete(moduleId);
        featureFlags.set(moduleId, { enabled: false, disabled: true, visible: false });
        await tenantModuleRepository.update(moduleId, { enabled: false });
      }

      await mod.upgrade(featureContext, fromVersion, toVersion);
      await migrationService.runForModule(moduleId);

      await tenantModuleRepository.update(moduleId, {
        moduleVersion: toVersion,
        imageVersion: toVersion,
      });

      if (wasEnabled) {
        await mod.initialize(featureContext);
        await mod.enable(featureContext);
        hookSystem.registerAll(mod.registerHooks(featureContext));
        this.activatedIds.add(moduleId);
        featureFlags.set(moduleId, { enabled: true, disabled: false, visible: true });
        if (this.moduleRouter) {
          await this.mountModuleRoutes(moduleId);
        }
        const health = await this.deps.healthService.checkModule(moduleId, mod, featureContext);
        await tenantModuleRepository.update(moduleId, {
          lastHealthStatus: health.status,
          lastHealthCheck: new Date(),
        });
      }

      await this.clearLifecycleError(moduleId);
      await auditService.log({
        action: 'module.upgraded',
        moduleId,
        details: { from: fromVersion, to: toVersion },
      });
      await hookSystem.emit(CORE_HOOKS.MODULE_UPGRADED, { moduleId, from: fromVersion, to: toVersion });
      await this.refreshExtensionPoints();
      logger.info(`Modul aktualisiert: ${moduleId} ${fromVersion} → ${toVersion}`);
    } catch (err) {
      await this.setLastError(moduleId, this.errorMessage(err));
      throw err;
    }
  }

  async mountRoutes(apiRouter: Router): Promise<void> {
    this.moduleRouter = Router();
    apiRouter.use('/modules', this.moduleRouter);

    for (const moduleId of this.activatedIds) {
      await this.mountModuleRoutes(moduleId);
    }
    await this.mountInstalledConfigRoutes();
  }

  private async mountInstalledConfigRoutes(): Promise<void> {
    const { moduleRegistry } = this.deps;
    for (const mod of moduleRegistry.getModules()) {
      if (await tenantModuleRepository.isInstalledForAnyTenant(mod.id)) {
        await this.mountModuleConfigRoutes(mod.id);
      }
    }
  }

  private moduleGuard(moduleId: string): RequestHandler {
    return (_req, res, next) => {
      void (async () => {
        if (!this.activatedIds.has(moduleId)) {
          res.status(404).json({ error: 'Modul nicht aktiviert' });
          return;
        }
        const row = await tenantModuleRepository.findUnique(moduleId);
        if (!row?.installed || !row?.enabled) {
          res.status(404).json({ error: 'Modul für diesen Veranstalter nicht aktiviert' });
          return;
        }
        next();
      })().catch(next);
    };
  }

  private async mountModuleRoutes(moduleId: string): Promise<void> {
    if (!this.moduleRouter) return;
    const mod = this.deps.moduleRegistry.getModule(moduleId);
    if (!mod) return;

    for (const route of mod.registerRoutes(this.deps.featureContext)) {
      if (route.requireActivation === false) continue;
      await this.attachModuleRoute(moduleId, route);
    }
  }

  private async mountModuleConfigRoutes(moduleId: string): Promise<void> {
    if (!this.moduleRouter) return;
    const mod = this.deps.moduleRegistry.getModule(moduleId);
    if (!mod) return;

    for (const route of mod.registerRoutes(this.deps.featureContext)) {
      if (route.requireActivation !== false) continue;
      await this.attachModuleRoute(moduleId, route, false);
    }
  }

  private async attachModuleRoute(
    moduleId: string,
    route: import('./types').ModuleRouteRegistration,
    requireActivation = true
  ): Promise<void> {
    if (!this.moduleRouter) return;
    const mountPath = `/features/${moduleId}${route.mountPath ?? route.path}`;
    const key = this.routeMountKey(moduleId, mountPath);
    if (this.mountedRouteKeys.has(key)) return;
    this.mountedRouteKeys.add(key);

    const middlewares: RequestHandler[] = [];
    if (requireActivation) {
      middlewares.push(this.moduleGuard(moduleId));
    }
    if (route.requiredPermission) {
      middlewares.push(requirePermission(route.requiredPermission));
    }
    this.moduleRouter.use(mountPath, ...middlewares, route.router);
    logger.info(`Route gemountet: /api/modules${mountPath}`);
  }

  async installModule(moduleId: string): Promise<void> {
    const mod = this.deps.moduleRegistry.getModule(moduleId);
    const manifest = this.deps.moduleRegistry.getManifest(moduleId);
    if (!mod || !manifest) throw new AppError(404, 'Modul nicht gefunden');

    const row = await this.deps.moduleRegistry.getDbRow(moduleId);
    if (!row?.available) {
      throw new AppError(403, 'Modul steht diesem Mandanten nicht zur Verfügung');
    }
    if (row?.installed) throw new AppError(400, 'Modul ist bereits installiert');

    try {
      await mod.install(this.deps.featureContext);
      await this.deps.migrationService.runForModule(moduleId);

      const contract = mod.getConfigContract?.();
      if (contract?.defaults) {
        await this.deps.settingsService.setValues(`module.${moduleId}`, contract.defaults as Record<string, unknown>, {
          partial: false,
        });
      }

      await tenantModuleRepository.upsert(
        moduleId,
        {
          moduleVersion: manifest.version,
          imageVersion: manifest.version,
          installed: true,
          enabled: false,
          installedAt: new Date(),
          everInstalled: true,
        },
        {
          installed: true,
          installedAt: new Date(),
          everInstalled: true,
          moduleVersion: manifest.version,
          imageVersion: manifest.version,
        }
      );

      await this.clearLifecycleError(moduleId);
      await this.deps.auditService.log({ action: 'module.installed', moduleId });
      await this.deps.hookSystem.emit(CORE_HOOKS.MODULE_INSTALLED, { moduleId });
      await this.refreshExtensionPoints();
      if (this.moduleRouter) {
        await this.mountModuleConfigRoutes(moduleId);
      }
      logger.info(`Modul installiert: ${moduleId}`);
    } catch (err) {
      await this.setLastError(moduleId, this.errorMessage(err));
      throw err;
    }
  }

  async uninstallModule(moduleId: string): Promise<void> {
    const mod = this.deps.moduleRegistry.getModule(moduleId);
    if (!mod) throw new AppError(404, 'Modul nicht gefunden');

    if (await this.deps.moduleRegistry.isActivated(moduleId)) {
      await this.deactivateModule(moduleId);
    }

    await mod.uninstall(this.deps.featureContext);

    await tenantModuleRepository.update(moduleId, {
      installed: false,
      enabled: false,
    });

    await this.deps.auditService.log({ action: 'module.uninstalled', moduleId });
    await this.refreshExtensionPoints();
    logger.info(`Modul deinstalliert: ${moduleId}`);
  }

  async activateModule(moduleId: string): Promise<void> {
    await this.activateModuleInternal(moduleId, true);
  }

  private async activateModuleInternal(moduleId: string, persist: boolean): Promise<void> {
    const { moduleRegistry, dependencyResolver, featureContext, hookSystem, featureFlags, healthService, auditService } = this.deps;
    const mod = moduleRegistry.getModule(moduleId);
    const manifest = moduleRegistry.getManifest(moduleId);
    if (!mod || !manifest) throw new AppError(404, 'Modul nicht gefunden');

    const row = persist ? await moduleRegistry.getDbRow(moduleId) : await tenantModuleRepository.findFirstInstalled(moduleId);
    if (persist && !row?.available) {
      throw new AppError(403, 'Modul steht diesem Mandanten nicht zur Verfügung');
    }
    const installed = persist ? Boolean(row?.installed) : await tenantModuleRepository.isInstalledForAnyTenant(moduleId);
    if (!installed) throw new AppError(400, 'Modul muss zuerst installiert werden');

    const deps = await dependencyResolver.checkRequiredActivated(
      manifest,
      async (id) => this.activatedIds.has(id) || tenantModuleRepository.isEnabledForAnyTenant(id)
    );
    if (!deps.ok) {
      const parts: string[] = [];
      if (deps.missing.length) parts.push(`fehlend: ${deps.missing.join(', ')}`);
      if (deps.inactive.length) parts.push(`nicht aktiviert: ${deps.inactive.join(', ')}`);
      throw new AppError(400, `Abhängigkeiten nicht erfüllt (${parts.join('; ')})`);
    }

    if (row && compareVersions(manifest.version, row.moduleVersion) > 0) {
      throw new AppError(400, 'Upgrade erforderlich – bitte zuerst aktualisieren');
    }

    try {
      await mod.initialize(featureContext);
      await mod.enable(featureContext);
      hookSystem.registerAll(mod.registerHooks(featureContext));
      this.activatedIds.add(moduleId);
      featureFlags.set(moduleId, { ...featureFlags.get(moduleId), enabled: true, disabled: false, visible: true });

      if (this.moduleRouter) {
        await this.mountModuleRoutes(moduleId);
      }

      const health = await healthService.checkModule(moduleId, mod, featureContext);

      if (persist) {
        await tenantModuleRepository.update(moduleId, {
          enabled: true,
          everActivated: true,
          lastHealthStatus: health.status,
          lastHealthCheck: new Date(),
        });
        await this.clearLifecycleError(moduleId);
        await auditService.log({ action: 'module.enabled', moduleId, details: { health: health.status } });
        await hookSystem.emit(CORE_HOOKS.MODULE_ACTIVATED, { moduleId });
      }

      await this.refreshExtensionPoints();
      logger.info(`Modul aktiviert: ${moduleId}`);
    } catch (err) {
      if (persist) {
        await this.setLastError(moduleId, this.errorMessage(err));
      }
      throw err;
    }
  }

  async deactivateModule(moduleId: string): Promise<void> {
    const { moduleRegistry, dependencyResolver, featureContext, hookSystem, featureFlags, auditService } = this.deps;
    const mod = moduleRegistry.getModule(moduleId);
    if (!mod) throw new AppError(404, 'Modul nicht gefunden');

    const dependents = dependencyResolver.getDependents(moduleId, moduleRegistry.getAllManifests());
    for (const depId of dependents) {
      if (await moduleRegistry.isActivated(depId)) {
        throw new AppError(400, `Modul wird von ${depId} benötigt – zuerst deaktivieren`);
      }
    }

    await mod.disable(featureContext);
    await mod.shutdown(featureContext);
    hookSystem.unsubscribe(moduleId);
    this.activatedIds.delete(moduleId);
    featureFlags.set(moduleId, { ...featureFlags.get(moduleId), enabled: false, disabled: true, visible: false });

    await tenantModuleRepository.update(moduleId, { enabled: false });

    await auditService.log({ action: 'module.deactivated', moduleId });
    await hookSystem.emit(CORE_HOOKS.MODULE_DEACTIVATED, { moduleId });
    await this.refreshExtensionPoints();
    this.rebuildModuleRouter(moduleId);
    logger.info(`Modul deaktiviert: ${moduleId}`);
  }

  /**
   * Express cannot unmount middleware once mounted. Deactivated modules are blocked
   * by moduleGuard (404). Clearing mount keys allows clean remount on reactivation.
   */
  private rebuildModuleRouter(moduleId: string): void {
    for (const key of [...this.mountedRouteKeys]) {
      if (key.startsWith(`${moduleId}:`)) {
        this.mountedRouteKeys.delete(key);
      }
    }
  }

  async reinitializeModule(moduleId: string): Promise<void> {
    const wasActive = await this.deps.moduleRegistry.isActivated(moduleId);
    if (wasActive) await this.deactivateModule(moduleId);
    await this.uninstallModule(moduleId);
    await this.installModule(moduleId);
    if (wasActive) await this.activateModule(moduleId);
  }

  async runHealthCheck(moduleId: string) {
    const mod = this.deps.moduleRegistry.getModule(moduleId);
    if (!mod) throw new AppError(404, 'Modul nicht gefunden');

    return this.deps.healthService.checkModule(moduleId, mod, this.deps.featureContext);
  }

  private async refreshExtensionPoints(): Promise<void> {
    const { moduleRegistry, metadataRegistry, featureContext } = this.deps;

    for (const mod of moduleRegistry.getModules()) {
      const manifest = moduleRegistry.getManifest(mod.id)!;
      const activated = this.activatedIds.has(mod.id);
      metadataRegistry.resolve(manifest, mod, activated, featureContext);
    }

    const aggregated = metadataRegistry.aggregate(this.activatedIds);
    moduleRegistry.setMenuItems(aggregated.menus);
    moduleRegistry.setWidgets(aggregated.widgets);
    moduleRegistry.setPermissions(aggregated.permissions);
  }

  async shutdown(): Promise<void> {
    for (const moduleId of [...this.activatedIds]) {
      const mod = this.deps.moduleRegistry.getModule(moduleId);
      if (mod) {
        await mod.shutdown(this.deps.featureContext);
      }
    }
    this.deps.hookSystem.clear();
    this.deps.metadataRegistry.clear();
    this.activatedIds.clear();
    this.initialized = false;
  }

  async updateModuleConfig(moduleId: string, configData: Record<string, unknown>): Promise<void> {
    const mod = this.deps.moduleRegistry.getModule(moduleId);
    if (!mod) throw new AppError(404, 'Modul nicht gefunden');

    const contract = mod.getConfigContract?.();
    if (contract) {
      contract.schema.parse(configData);
    }

    await this.deps.settingsService.setValues(`module.${moduleId}`, configData, { partial: false });
  }

  async getModuleConfig(moduleId: string): Promise<Record<string, unknown>> {
    return this.deps.settingsService.getValues(`module.${moduleId}`);
  }

  async enableModule(id: string): Promise<void> {
    if (!(await this.deps.moduleRegistry.isInstalled(id))) {
      await this.installModule(id);
    }
    await this.activateModule(id);
  }

  async disableModule(id: string): Promise<void> {
    await this.deactivateModule(id);
  }

  getActivatedIds(): ReadonlySet<string> {
    return this.activatedIds;
  }
}
