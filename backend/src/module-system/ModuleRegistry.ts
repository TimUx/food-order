import { prisma } from '../config/database';
import { config } from '../config';
import type { InstalledModule } from '@prisma/client';
import type { Module, ModuleInfo, ModuleMenuItem, ModulePermissionDefinition, ModuleWidget } from './types';
import { compareVersions } from './types';
import { featureFlags } from './FeatureFlags';
import { featureContext } from './FeatureContext';
import { moduleDiscovery } from './ModuleDiscovery';
import type { ModuleManifest, ModuleStatus } from './manifest';
import { MODULE_STATUS_LABELS } from './manifest';

export function deriveModuleStatus(row: InstalledModule | null): ModuleStatus {
  if (!row || (!row.installed && !row.everInstalled)) return 'AVAILABLE';
  if (!row.installed && row.everInstalled) return 'UNINSTALLED';
  if (row.installed && row.enabled) return 'ACTIVATED';
  if (row.installed && !row.enabled && row.everActivated) return 'DISABLED';
  if (row.installed && !row.enabled) return 'INSTALLED';
  return 'AVAILABLE';
}

class ModuleRegistryImpl {
  private modules = new Map<string, Module>();
  private manifests = new Map<string, ModuleManifest>();
  private menuItems: ModuleMenuItem[] = [];
  private widgets: ModuleWidget[] = [];
  private permissions: ModulePermissionDefinition[] = [];

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

  getFeature(id: string): Module | undefined {
    return this.getModule(id);
  }

  getManifest(id: string): ModuleManifest | undefined {
    return this.manifests.get(id);
  }

  getAllManifests(): ModuleManifest[] {
    return Array.from(this.manifests.values());
  }

  async getDbRow(moduleId: string): Promise<InstalledModule | null> {
    return prisma.installedModule.findUnique({ where: { moduleId } });
  }

  async isActivated(moduleId: string): Promise<boolean> {
    const row = await this.getDbRow(moduleId);
    return Boolean(row?.installed && row?.enabled);
  }

  async isInstalled(moduleId: string): Promise<boolean> {
    const row = await this.getDbRow(moduleId);
    return Boolean(row?.installed);
  }

  async getAllModuleInfo(): Promise<ModuleInfo[]> {
    const manifests = this.getAllManifests();
    const rows = await prisma.installedModule.findMany();
    const rowMap = new Map(rows.map((r) => [r.moduleId, r]));

    return Promise.all(
      manifests.map(async (manifest) => {
        const mod = this.getModule(manifest.id)!;
        const row = rowMap.get(manifest.id) ?? null;
        const status = deriveModuleStatus(row);
        const enabled = status === 'ACTIVATED';
        const installed = Boolean(row?.installed);

        const flags = featureFlags.get(manifest.id);
        flags.enabled = enabled;
        flags.disabled = !enabled;
        flags.visible = enabled;
        flags.health = (row?.lastHealthStatus as ModuleInfo['flags']['health']) ?? 'unknown';

        const contract = mod.getConfigContract?.();
        const upgradeAvailable = row
          ? compareVersions(manifest.version, row.moduleVersion) > 0
          : false;

        return {
          id: manifest.id,
          name: manifest.name,
          version: manifest.version,
          imageVersion: manifest.version,
          description: manifest.description,
          author: manifest.author,
          homepage: manifest.homepage,
          license: manifest.license,
          status,
          installed,
          enabled,
          flags: { ...flags },
          permissions: manifest.permissions.length > 0
            ? manifest.permissions
            : mod.registerPermissions(featureContext),
          menuItems: enabled ? mod.registerMenus(featureContext) : [],
          widgets: enabled ? mod.registerWidgets(featureContext) : [],
          hasConfig: Boolean(contract),
          dependencies: manifest.dependencies,
          minimumCoreVersion: manifest.minimumCoreVersion,
          installedAt: row?.installedAt?.toISOString(),
          lastHealthStatus: row?.lastHealthStatus ?? undefined,
          lastHealthCheck: row?.lastHealthCheck?.toISOString(),
          upgradeAvailable,
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

export const moduleRegistry = new ModuleRegistryImpl();
export { MODULE_STATUS_LABELS };
