import { config } from '../config';
import type { TenantModule } from '@prisma/client';
import { tenantModuleRepository } from '../repositories/tenantModuleRepository';
import type { Module, ModuleInfo, ModuleMenuItem, ModulePermissionDefinition, ModuleWidget, FeatureContext } from './types';
import { compareVersions } from './types';
import type { FeatureFlags } from './FeatureFlags';
import type { ModuleManifest, ModuleStatus } from './manifest';
import type { MetadataRegistry } from './MetadataRegistry';
import type { DependencyResolver } from './DependencyResolver';

export interface ModuleRegistryPlatformDeps {
  featureFlags: FeatureFlags;
  metadataRegistry: MetadataRegistry;
  featureContext: FeatureContext;
  dependencyResolver: DependencyResolver;
}

export function deriveModuleStatus(row: TenantModule | null): ModuleStatus {
  if (!row) return 'AVAILABLE';
  if (row.lifecycleStatus === 'UPGRADING') return 'UPGRADING';
  if (row.lifecycleStatus === 'FAILED') return 'FAILED';
  if (!row.installed) return 'AVAILABLE';
  if (row.installed && row.enabled) return 'ENABLED';
  if (row.installed && !row.enabled && row.everActivated) return 'DISABLED';
  if (row.installed && !row.enabled) return 'INSTALLED';
  return 'AVAILABLE';
}

export class ModuleRegistry {
  private modules = new Map<string, Module>();
  private manifests = new Map<string, ModuleManifest>();
  private menuItems: ModuleMenuItem[] = [];
  private widgets: ModuleWidget[] = [];
  private permissions: ModulePermissionDefinition[] = [];
  private platformDeps?: ModuleRegistryPlatformDeps;

  bindPlatformDeps(deps: ModuleRegistryPlatformDeps): void {
    this.platformDeps = deps;
  }

  register(module: Module, manifest: ModuleManifest): void {
    if (this.modules.has(module.id)) {
      throw new Error(`Module already registered: ${module.id}`);
    }
    this.modules.set(module.id, module);
    this.manifests.set(manifest.id, manifest);
  }

  getModules(): Module[] {
    return Array.from(this.modules.values());
  }

  getModule(id: string): Module | undefined {
    return this.modules.get(id);
  }

  getManifest(id: string): ModuleManifest | undefined {
    return this.manifests.get(id);
  }

  getAllManifests(): ModuleManifest[] {
    return Array.from(this.manifests.values());
  }

  async getDbRow(moduleId: string): Promise<TenantModule | null> {
    return tenantModuleRepository.findUnique(moduleId);
  }

  async isActivated(moduleId: string): Promise<boolean> {
    const row = await this.getDbRow(moduleId);
    return Boolean(row?.installed && row?.enabled);
  }

  async isInstalled(moduleId: string): Promise<boolean> {
    const row = await this.getDbRow(moduleId);
    return Boolean(row?.installed);
  }

  async getAllModuleInfo(
    featureFlags?: FeatureFlags,
    metadataRegistry?: MetadataRegistry,
    context?: FeatureContext
  ): Promise<ModuleInfo[]> {
    const deps = this.platformDeps;
    if (!deps) {
      throw new Error('ModuleRegistry: platform dependencies not bound');
    }
    return this.getAllModuleInfoResolved(
      featureFlags ?? deps.featureFlags,
      metadataRegistry ?? deps.metadataRegistry,
      context ?? deps.featureContext
    );
  }

  private async getAllModuleInfoResolved(
    featureFlags: FeatureFlags,
    metadataRegistry: MetadataRegistry,
    context: FeatureContext
  ): Promise<ModuleInfo[]> {
    const deps = this.platformDeps!;
    const rows = await tenantModuleRepository.findManyForTenant();
    const rowMap = new Map(rows.map((r) => [r.moduleId, r]));

    const showPreview = process.env.SHOW_PREVIEW_MODULES === '1';
    const manifests = this.getAllManifests().filter(
      (manifest) => showPreview || manifest.productionReady
    );

    return Promise.all(
      manifests.map(async (manifest) => {
        const mod = this.getModule(manifest.id)!;
        const row = rowMap.get(manifest.id) ?? null;
        const status = deriveModuleStatus(row);
        const enabled = status === 'ENABLED';
        const installed = Boolean(row?.installed);

        const flags = featureFlags.get(manifest.id);
        flags.enabled = enabled;
        flags.disabled = !enabled;
        flags.visible = enabled;
        flags.health = (row?.lastHealthStatus as ModuleInfo['flags']['health']) ?? 'unknown';

        const depCheck = await deps.dependencyResolver.checkRequiredActivated(
          manifest,
          (id) => this.isActivated(id)
        );

        const meta = metadataRegistry.resolve(manifest, mod, enabled, context);
        const contract = mod.getConfigContract?.();
        const imageVersion = manifest.version;
        const installedVersion = row?.moduleVersion ?? '0.0.0';
        const upgradeAvailable = row
          ? compareVersions(imageVersion, installedVersion) > 0
          : false;

        return {
          id: manifest.id,
          name: manifest.name,
          version: imageVersion,
          imageVersion,
          description: manifest.description,
          author: manifest.author,
          homepage: manifest.homepage,
          license: manifest.license,
          status,
          installed,
          enabled,
          flags: { ...flags },
          permissions: meta.permissions,
          menuItems: meta.menus,
          widgets: meta.widgets,
          hasConfig: Boolean(contract),
          settingsPath: meta.settings?.adminPath,
          dependencies: manifest.dependencies,
          minimumCoreVersion: manifest.minimumCoreVersion,
          installedAt: row?.installedAt?.toISOString(),
          installedVersion,
          lastHealthStatus: row?.lastHealthStatus ?? undefined,
          lastHealthCheck: row?.lastHealthCheck?.toISOString(),
          lastError: row?.lastError ?? undefined,
          schemaVersion: row?.schemaVersion ?? undefined,
          upgradeAvailable,
          productionReady: manifest.productionReady,
          dependencyStatus: {
            satisfied: depCheck.ok,
            missing: depCheck.missing,
            inactive: depCheck.inactive,
          },
        };
      })
    );
  }

  setMenuItems(items: ModuleMenuItem[]): void {
    this.menuItems = items;
  }

  getMenuItems(): ModuleMenuItem[] {
    return this.menuItems;
  }

  setWidgets(widgets: ModuleWidget[]): void {
    this.widgets = widgets;
  }

  getWidgets(): ModuleWidget[] {
    return this.widgets;
  }

  setPermissions(perms: ModulePermissionDefinition[]): void {
    this.permissions = perms;
  }

  getPermissions(): ModulePermissionDefinition[] {
    return this.permissions;
  }

  satisfiesCoreVersion(manifest: ModuleManifest): boolean {
    return compareVersions(config.coreVersion, manifest.minimumCoreVersion) >= 0;
  }
}
