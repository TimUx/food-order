import type { ModuleRegistry } from './ModuleRegistry';
import type { MetadataRegistry } from './MetadataRegistry';
import type { SettingsService } from './settings/SettingsService';
import type { SettingsNamespaceInfo } from './settings/types';
import type { ModuleInfo, ModuleWidget } from './types';
import type { CoreAdminMetadataRegistry } from './adminUi/CoreAdminMetadataRegistry';
import type {
  AdminDeveloperPageDefinition,
  AdminHealthDefinition,
  AdminNavItem,
  AdminPageDefinition,
  AdminReportDefinition,
  AdminUiCatalog,
  AdminWidgetDefinition,
} from './adminUi/types';
import { CORE_SETTINGS_PARENT, CORE_VOLUNTEER_DASHBOARD_PATHS, CORE_VOLUNTEER_SETTINGS_NAMESPACES } from '../core/admin/coreAdminMetadata';

function sortByOrder<T extends { sortOrder?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100));
}

function uniqueByPath<T extends { path: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.path)) return false;
    seen.add(item.path);
    return true;
  });
}

export class AdminUiService {
  constructor(
    private readonly moduleRegistry: ModuleRegistry,
    private readonly metadataRegistry: MetadataRegistry,
    private readonly settingsService: SettingsService,
    private readonly coreAdminMetadata: CoreAdminMetadataRegistry
  ) {}

  async getCatalog(): Promise<AdminUiCatalog> {
    const modules: ModuleInfo[] = await this.moduleRegistry.getAllModuleInfo();
    const activeIds = new Set(
      modules.filter((m) => m.status === 'ENABLED').map((m) => m.id)
    );
    const installedIds = new Set(
      modules.filter((m) => m.installed).map((m) => m.id)
    );
    const aggregated = this.metadataRegistry.aggregate(activeIds);
    const activeModuleIds = [...activeIds];

    const builtinPages = this.coreAdminMetadata.getBuiltinPages();
    const settingsPages = this.buildSettingsPages(installedIds);
    const reportPages = this.buildReportPages(activeModuleIds);
    const developerPages = this.buildDeveloperPages(activeModuleIds);

    const pages = uniqueByPath([
      ...builtinPages,
      ...settingsPages,
      ...reportPages,
      ...developerPages,
    ]);

    const settingsNav: AdminNavItem[] = settingsPages
      .filter((p) => {
        const ns = p.namespace ?? '';
        return (CORE_VOLUNTEER_SETTINGS_NAMESPACES as readonly string[]).includes(ns);
      })
      .map((p) => ({
        id: p.id,
        label: p.label,
        path: p.path,
        icon: p.icon,
        parentId: CORE_SETTINGS_PARENT,
        sortOrder: p.sortOrder,
        requiredPermission: p.requiredPermission,
        source: p.source,
        moduleId: p.moduleId,
      }));

    const navigation = uniqueByPath(
      sortByOrder([
        { id: 'admin-dashboard', label: 'Übersicht', path: '/admin', icon: 'Dashboard', sortOrder: 0, source: 'core' as const },
        ...this.coreAdminMetadata.getBuiltinNavigation(),
        ...settingsNav,
      ])
    );

    const staffTile = this.coreAdminMetadata.getStaffDashboardTile();
    const dashboardTiles = sortByOrder([
      ...pages
        .filter((p) => p.pageType !== 'dashboard' && p.path !== '/admin/payment')
        .filter((p) => CORE_VOLUNTEER_DASHBOARD_PATHS.has(p.path))
        .map((p) => ({
          id: p.id,
          label: p.label,
          description: p.description,
          path: p.path,
          icon: p.icon,
          sortOrder: p.sortOrder,
          source: p.source,
          moduleId: p.moduleId,
        })),
      ...(staffTile ? [staffTile] : []),
    ]);

    const widgets: AdminWidgetDefinition[] = aggregated.widgets.map((w: ModuleWidget) => ({
      id: w.id,
      title: w.title,
      componentId: w.componentId,
      sortOrder: w.sortOrder,
      moduleId: w.moduleId,
    }));

    const enabledModules = modules.filter((m) => m.status === 'ENABLED');
    const health = this.buildHealth(enabledModules);
    const reports = this.buildReports(activeModuleIds);
    const devPages = this.buildDeveloperPageDefs(activeModuleIds);

    return {
      navigation,
      pages,
      dashboardTiles,
      widgets,
      health: [],
      technicalDetails: { health },
      reports,
      developerPages: devPages,
    };
  }

  private buildSettingsPages(installedModuleIds: Set<string>): AdminPageDefinition[] {
    const settingsIcons = this.coreAdminMetadata.getSettingsIcons();
    const settingsSort = this.coreAdminMetadata.getSettingsSort();

    return this.settingsService.listNamespaces()
      .filter((ns: SettingsNamespaceInfo) => {
        if (!ns.namespace.startsWith('module.')) return true;
        const moduleId = ns.namespace.slice('module.'.length);
        return installedModuleIds.has(moduleId);
      })
      .map((ns: SettingsNamespaceInfo) => {
      const isModule = ns.namespace.startsWith('module.');
      const moduleId = isModule ? ns.namespace.replace(/^module\./, '') : undefined;
      return {
        id: `settings-${ns.namespace}`,
        label: ns.label,
        description: ns.description,
        path: ns.adminPath ?? `/admin/settings/${ns.namespace}`,
        icon: settingsIcons[ns.namespace] ?? (isModule ? 'Extension' : 'Settings'),
        pageType: 'settings',
        sortOrder: settingsSort[ns.namespace] ?? (isModule ? 200 : 20),
        requiredPermission: ns.permission,
        source: isModule ? 'module' : 'core',
        moduleId,
        namespace: ns.namespace,
      };
    });
  }

  private buildReportPages(moduleIds: string[]): AdminPageDefinition[] {
    return this.buildReports(moduleIds).map((r) => ({
      id: r.id,
      label: r.label,
      description: r.description,
      path: r.path,
      icon: r.icon ?? 'Assessment',
      pageType: 'report',
      sortOrder: r.sortOrder,
      requiredPermission: r.requiredPermission,
      source: 'module',
      moduleId: r.moduleId,
      componentId: r.componentId,
      reportId: r.id,
    }));
  }

  private buildDeveloperPages(moduleIds: string[]): AdminPageDefinition[] {
    return this.buildDeveloperPageDefs(moduleIds).map((d) => ({
      id: d.id,
      label: d.label,
      description: d.description,
      path: d.path,
      icon: d.icon ?? 'Code',
      pageType: 'developer',
      sortOrder: d.sortOrder,
      requiredPermission: d.requiredPermission,
      source: 'module',
      moduleId: d.moduleId,
      componentId: d.componentId,
    }));
  }

  private buildReports(moduleIds: string[]): AdminReportDefinition[] {
    const reports: AdminReportDefinition[] = [];
    for (const moduleId of moduleIds) {
      const meta = this.metadataRegistry.get(moduleId);
      if (!meta?.reports?.length) continue;
      for (const report of meta.reports) {
        reports.push({
          ...report,
          moduleId,
          path: report.path ?? `/admin/reports/${moduleId}/${report.id}`,
        });
      }
    }
    return sortByOrder(reports);
  }

  private buildDeveloperPageDefs(moduleIds: string[]): AdminDeveloperPageDefinition[] {
    const pages: AdminDeveloperPageDefinition[] = [];
    for (const moduleId of moduleIds) {
      const meta = this.metadataRegistry.get(moduleId);
      if (!meta?.developerPages?.length) continue;
      for (const page of meta.developerPages) {
        pages.push({
          ...page,
          moduleId,
          path: page.path ?? `/admin/developer/${moduleId}/${page.id}`,
        });
      }
    }
    return sortByOrder(pages);
  }

  private buildHealth(modules: ModuleInfo[]): AdminHealthDefinition[] {
    const health: AdminHealthDefinition[] = [];
    for (const mod of modules) {
      const meta = this.metadataRegistry.get(mod.id);
      const checks = meta?.healthChecks ?? [];
      if (checks.length === 0) {
        health.push({
          id: `${mod.id}-health`,
          moduleId: mod.id,
          label: mod.name,
          description: 'Modul-Gesundheit',
          status: mod.flags.health,
          lastCheck: mod.lastHealthCheck,
        });
        continue;
      }
      for (const check of checks) {
        health.push({
          id: `${mod.id}-${check.id}`,
          moduleId: mod.id,
          label: check.label,
          description: check.description,
          status: mod.flags.health,
          lastCheck: mod.lastHealthCheck,
        });
      }
    }
    return health;
  }
}
