import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminUiService } from '../AdminUiService';
import { CoreAdminMetadataRegistry } from '../adminUi/CoreAdminMetadataRegistry';
import type { ModuleRegistry } from '../ModuleRegistry';
import type { MetadataRegistry } from '../MetadataRegistry';
import type { SettingsService } from '../settings/SettingsService';
import { CORE_BUILTIN_PAGES, CORE_STAFF_LINK, CORE_SETTINGS_ICONS, CORE_SETTINGS_SORT } from '../../core/admin/coreAdminMetadata';

describe('AdminUiService', () => {
  const moduleRegistry = {
    getAllModuleInfo: vi.fn(),
  } as unknown as ModuleRegistry;

  const metadataRegistry = {
    aggregate: vi.fn(),
    get: vi.fn(),
  } as unknown as MetadataRegistry;

  const settingsService = {
    listNamespaces: vi.fn(),
  } as unknown as SettingsService;

  const coreAdminMetadata = new CoreAdminMetadataRegistry();
  let service: AdminUiService;

  beforeEach(() => {
    vi.clearAllMocks();
    coreAdminMetadata.register({
      builtinPages: CORE_BUILTIN_PAGES,
      settingsIcons: CORE_SETTINGS_ICONS,
      settingsSort: CORE_SETTINGS_SORT,
      staffDashboardTile: CORE_STAFF_LINK,
    });
    service = new AdminUiService(moduleRegistry, metadataRegistry, settingsService, coreAdminMetadata);
  });

  it('builds catalog from core pages, settings and active module metadata', async () => {
    vi.mocked(moduleRegistry.getAllModuleInfo).mockResolvedValue([
      {
        id: 'payment',
        name: 'Online-Zahlung',
        status: 'ENABLED',
        installed: true,
        flags: { health: 'healthy' },
        lastHealthCheck: '2026-07-08T12:00:00.000Z',
      },
      {
        id: 'printer',
        name: 'Bondruck',
        status: 'DISABLED',
        installed: true,
        flags: { health: 'unknown' },
      },
    ] as never);

    vi.mocked(metadataRegistry.aggregate).mockReturnValue({
      menus: [{
        id: 'payment-settings',
        label: 'Payment',
        path: '/admin/settings/module.payment',
        icon: 'Payment',
        sortOrder: 10,
        moduleId: 'payment',
      }],
      widgets: [{
        id: 'payment-status',
        title: 'Online-Zahlung',
        componentId: 'payment.status',
        sortOrder: 10,
        moduleId: 'payment',
      }],
      permissions: [],
    });

    vi.mocked(metadataRegistry.get).mockImplementation((id: string) => {
      if (id === 'payment') {
        return {
          moduleId: 'payment',
          healthChecks: [{ id: 'providers', label: 'Zahlungsanbieter' }],
          reports: [],
          developerPages: [],
        } as never;
      }
      if (id === 'printer') {
        return {
          moduleId: 'printer',
          healthChecks: [{ id: 'printer', label: 'Drucker' }],
          reports: [{ id: 'daily', label: 'Tagesbericht', componentId: 'printer.daily', path: '/admin/reports/printer/daily' }],
          developerPages: [],
        } as never;
      }
      return undefined;
    });

    vi.mocked(settingsService.listNamespaces).mockReturnValue([
      {
        namespace: 'core.club',
        label: 'Veranstalter',
        adminPath: '/admin/verein',
        groupCount: 1,
        fieldCount: 1,
      },
      {
        namespace: 'module.payment',
        label: 'Online-Zahlung',
        adminPath: '/admin/settings/module.payment',
        permission: 'payment.settings',
        groupCount: 1,
        fieldCount: 1,
      },
    ]);

    const catalog = await service.getCatalog();

    expect(catalog.pages.some((p) => p.id === 'core-users')).toBe(true);
    expect(catalog.pages.some((p) => p.namespace === 'core.club')).toBe(true);
    expect(catalog.widgets).toHaveLength(1);
    expect(catalog.health).toHaveLength(0);
    expect(catalog.technicalDetails?.health.some((h) => h.moduleId === 'payment')).toBe(true);
    expect(catalog.technicalDetails?.health.some((h) => h.moduleId === 'printer')).toBe(false);
    expect(catalog.reports.some((r) => r.moduleId === 'printer')).toBe(false);
    expect(catalog.navigation.some((n) => n.path === '/admin/verein')).toBe(true);
  });
});
