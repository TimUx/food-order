import { Router, RequestHandler } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { featureContext } from './FeatureContext';
import { featureFlags } from './FeatureFlags';
import { featureHooks } from './FeatureHooks';
import { moduleRegistry } from './ModuleRegistry';
import { moduleDiscovery } from './ModuleDiscovery';
import { moduleLoader } from './ModuleLoader';
import { dependencyResolver } from './DependencyResolver';
import { compareVersions } from './types';
import type { Module, ModuleMenuItem, ModulePermissionDefinition, ModuleWidget } from './types';

export class ModuleManager {
  private initialized = false;
  private moduleRouter: Router | null = null;
  private activatedIds = new Set<string>();

  async discoverAndRegister(): Promise<void> {
    const manifests = moduleDiscovery.discover();

    for (const manifest of manifests) {
      if (!moduleRegistry.satisfiesCoreVersion(manifest)) {
        logger.warn(
          `Modul ${manifest.id} benötigt Core ${manifest.minimumCoreVersion}, aktuell ${process.env.CORE_VERSION ?? '1.0.0'}`
        );
        continue;
      }

      const mod = await moduleLoader.load(manifest);
      moduleRegistry.register(mod, manifest);
      await this.ensureDbRow(manifest.id, manifest.version);
      logger.info(`Modul registriert: ${manifest.id} v${manifest.version}`);
    }
  }

  private async ensureDbRow(moduleId: string, version: string): Promise<void> {
    await prisma.installedModule.upsert({
      where: { moduleId },
      create: { moduleId, moduleVersion: version, installed: false, enabled: false },
      update: {},
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.discoverAndRegister();
    await this.checkUpgrades();

    for (const mod of moduleRegistry.getModules()) {
      const row = await moduleRegistry.getDbRow(mod.id);
      if (row?.installed && row.enabled) {
        await this.activateModuleInternal(mod.id, false);
      }
    }

    await this.refreshExtensionPoints();
    this.initialized = true;
    logger.info('Modulsystem initialisiert');
  }

  private async checkUpgrades(): Promise<void> {
    for (const manifest of moduleRegistry.getAllManifests()) {
      const row = await moduleRegistry.getDbRow(manifest.id);
      if (!row?.installed) continue;

      if (compareVersions(manifest.version, row.moduleVersion) > 0) {
        logger.info(`Upgrade verfügbar: ${manifest.id} ${row.moduleVersion} → ${manifest.version}`);
        const mod = moduleRegistry.getModule(manifest.id)!;
        await mod.upgrade(featureContext, row.moduleVersion, manifest.version);
        await prisma.installedModule.update({
          where: { moduleId: manifest.id },
          data: { moduleVersion: manifest.version },
        });
        if (row.enabled) {
          await mod.initialize(featureContext);
        }
      }
    }
  }

  async mountRoutes(apiRouter: Router): Promise<void> {
    this.moduleRouter = Router();
    apiRouter.use('/modules', this.moduleRouter);

    for (const moduleId of this.activatedIds) {
      await this.mountModuleRoutes(moduleId);
    }
  }

  private moduleGuard(moduleId: string): RequestHandler {
    return (_req, res, next) => {
      if (!this.activatedIds.has(moduleId)) {
        res.status(404).json({ error: 'Modul nicht aktiviert' });
        return;
      }
      next();
    };
  }

  private async mountModuleRoutes(moduleId: string): Promise<void> {
    if (!this.moduleRouter) return;
    const mod = moduleRegistry.getModule(moduleId);
    if (!mod) return;

    for (const route of mod.registerRoutes(featureContext)) {
      const mountPath = `/features/${moduleId}${route.mountPath ?? route.path}`;
      this.moduleRouter.use(mountPath, this.moduleGuard(moduleId), route.router);
      logger.info(`Route gemountet: /api/modules${mountPath}`);
    }
  }

  async installModule(moduleId: string): Promise<void> {
    const mod = moduleRegistry.getModule(moduleId);
    const manifest = moduleRegistry.getManifest(moduleId);
    if (!mod || !manifest) throw new AppError(404, 'Modul nicht gefunden');

    const row = await moduleRegistry.getDbRow(moduleId);
    if (row?.installed) throw new AppError(400, 'Modul ist bereits installiert');

    await mod.install(featureContext);

    const contract = mod.getConfigContract?.();
    const configJson = contract?.defaults ?? {};

    await prisma.installedModule.upsert({
      where: { moduleId },
      create: {
        moduleId,
        moduleVersion: manifest.version,
        installed: true,
        enabled: false,
        installedAt: new Date(),
        everInstalled: true,
        configJson: configJson as object,
      },
      update: {
        installed: true,
        installedAt: new Date(),
        everInstalled: true,
        moduleVersion: manifest.version,
        configJson: configJson as object,
      },
    });

    logger.info(`Modul installiert: ${moduleId}`);
  }

  async uninstallModule(moduleId: string): Promise<void> {
    const mod = moduleRegistry.getModule(moduleId);
    if (!mod) throw new AppError(404, 'Modul nicht gefunden');

    if (await moduleRegistry.isActivated(moduleId)) {
      await this.deactivateModule(moduleId);
    }

    await mod.uninstall(featureContext);

    await prisma.installedModule.update({
      where: { moduleId },
      data: { installed: false, enabled: false },
    });

    logger.info(`Modul deinstalliert: ${moduleId}`);
  }

  async activateModule(moduleId: string): Promise<void> {
    await this.activateModuleInternal(moduleId, true);
  }

  private async activateModuleInternal(moduleId: string, persist: boolean): Promise<void> {
    const mod = moduleRegistry.getModule(moduleId);
    const manifest = moduleRegistry.getManifest(moduleId);
    if (!mod || !manifest) throw new AppError(404, 'Modul nicht gefunden');

    const row = await moduleRegistry.getDbRow(moduleId);
    if (!row?.installed) throw new AppError(400, 'Modul muss zuerst installiert werden');

    const deps = await dependencyResolver.checkRequiredActivated(
      manifest,
      (id) => moduleRegistry.isActivated(id)
    );
    if (!deps.ok) {
      const parts: string[] = [];
      if (deps.missing.length) parts.push(`fehlend: ${deps.missing.join(', ')}`);
      if (deps.inactive.length) parts.push(`nicht aktiviert: ${deps.inactive.join(', ')}`);
      throw new AppError(400, `Abhängigkeiten nicht erfüllt (${parts.join('; ')})`);
    }

    if (compareVersions(manifest.version, row.moduleVersion) > 0) {
      await mod.upgrade(featureContext, row.moduleVersion, manifest.version);
    }

    await mod.initialize(featureContext);
    await mod.enable(featureContext);
    featureHooks.registerAll(mod.registerHooks(featureContext));
    this.activatedIds.add(moduleId);
    featureFlags.set(moduleId, { ...featureFlags.get(moduleId), enabled: true, disabled: false, visible: true });

    if (this.moduleRouter) {
      await this.mountModuleRoutes(moduleId);
    }

    const health = await mod.healthCheck(featureContext);
    if (persist) {
      await prisma.installedModule.update({
        where: { moduleId },
        data: {
          enabled: true,
          everActivated: true,
          moduleVersion: manifest.version,
          lastHealthStatus: health.status,
          lastHealthCheck: new Date(),
        },
      });
    }

    await this.refreshExtensionPoints();
    logger.info(`Modul aktiviert: ${moduleId}`);
  }

  async deactivateModule(moduleId: string): Promise<void> {
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
    featureHooks.unsubscribe(moduleId);
    this.activatedIds.delete(moduleId);
    featureFlags.set(moduleId, { ...featureFlags.get(moduleId), enabled: false, disabled: true, visible: false });

    await prisma.installedModule.update({
      where: { moduleId },
      data: { enabled: false },
    });

    await this.refreshExtensionPoints();
    logger.info(`Modul deaktiviert: ${moduleId}`);
  }

  async reinitializeModule(moduleId: string): Promise<void> {
    const wasActive = await moduleRegistry.isActivated(moduleId);
    if (wasActive) await this.deactivateModule(moduleId);
    await this.uninstallModule(moduleId);
    await this.installModule(moduleId);
    if (wasActive) await this.activateModule(moduleId);
  }

  async runHealthCheck(moduleId: string) {
    const mod = moduleRegistry.getModule(moduleId);
    if (!mod) throw new AppError(404, 'Modul nicht gefunden');

    const result = await mod.healthCheck(featureContext);
    await prisma.installedModule.update({
      where: { moduleId },
      data: {
        lastHealthStatus: result.status,
        lastHealthCheck: new Date(),
      },
    });
    featureFlags.updateHealth(moduleId, result.status);
    return result;
  }

  private async refreshExtensionPoints(): Promise<void> {
    const allMenus: ModuleMenuItem[] = [];
    const allWidgets: ModuleWidget[] = [];
    const allPerms: ModulePermissionDefinition[] = [];

    for (const mod of moduleRegistry.getModules()) {
      const manifest = moduleRegistry.getManifest(mod.id)!;
      allPerms.push(
        ...(manifest.permissions.length > 0
          ? manifest.permissions
          : mod.registerPermissions(featureContext))
      );

      if (this.activatedIds.has(mod.id)) {
        allMenus.push(...mod.registerMenus(featureContext));
        allWidgets.push(...mod.registerWidgets(featureContext).map((w) => ({ ...w, moduleId: mod.id })));
      }
    }

    moduleRegistry.setMenuItems(allMenus);
    moduleRegistry.setWidgets(allWidgets);
    moduleRegistry.setPermissions(allPerms);
  }

  async shutdown(): Promise<void> {
    for (const moduleId of [...this.activatedIds]) {
      const mod = moduleRegistry.getModule(moduleId);
      if (mod) {
        await mod.shutdown(featureContext);
      }
    }
    featureHooks.clear();
    this.activatedIds.clear();
    this.initialized = false;
  }

  async updateModuleConfig(moduleId: string, configData: Record<string, unknown>): Promise<void> {
    const mod = moduleRegistry.getModule(moduleId);
    if (!mod) throw new AppError(404, 'Modul nicht gefunden');

    const contract = mod.getConfigContract?.();
    if (contract) {
      contract.schema.parse(configData);
    }

    await featureContext.setConfig(moduleId, configData);
  }

  async getModuleConfig(moduleId: string): Promise<Record<string, unknown>> {
    return featureContext.getConfig(moduleId);
  }

  // Legacy aliases
  async enableModule(id: string): Promise<void> {
    if (!(await moduleRegistry.isInstalled(id))) {
      await this.installModule(id);
    }
    await this.activateModule(id);
  }

  async disableModule(id: string): Promise<void> {
    await this.deactivateModule(id);
  }
}

export const moduleManager = new ModuleManager();
