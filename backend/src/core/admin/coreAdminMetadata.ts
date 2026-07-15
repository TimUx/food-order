import type { CoreAdminMetadataRegistry } from '../../platform/adminUi/CoreAdminMetadataRegistry';
import type {
  AdminDashboardTile,
  AdminNavItem,
  AdminPageDefinition,
} from '../../platform/adminUi/types';

export const CORE_BUILTIN_PAGES: AdminPageDefinition[] = [
  {
    id: 'admin-dashboard',
    path: '/admin',
    label: 'Übersicht',
    description: 'Administrationsübersicht',
    icon: 'Dashboard',
    pageType: 'dashboard',
    sortOrder: 0,
    source: 'core',
  },
  {
    id: 'core-events',
    path: '/admin/veranstaltungen',
    label: 'Veranstaltungen',
    description: 'Veranstaltungen anlegen und aktivieren',
    icon: 'Event',
    pageType: 'builtin',
    componentId: 'core.events',
    sortOrder: 10,
    source: 'core',
  },
  {
    id: 'core-food-items',
    path: '/admin/speisen',
    label: 'Speisen & Getränke',
    description: 'Katalog für Speisen und Getränke pflegen',
    icon: 'RestaurantMenu',
    pageType: 'builtin',
    componentId: 'core.food-items',
    sortOrder: 20,
    source: 'core',
  },
  {
    id: 'core-users',
    path: '/admin/benutzer',
    label: 'Team',
    description: 'Mitarbeiter und Administratoren',
    icon: 'People',
    pageType: 'builtin',
    componentId: 'core.users',
    sortOrder: 25,
    source: 'core',
  },
  {
    id: 'core-modules',
    path: '/admin/module',
    label: 'Funktionen',
    description: 'Zahlung, Benachrichtigungen und Druck',
    icon: 'Extension',
    pageType: 'modules',
    componentId: 'core.modules',
    sortOrder: 30,
    source: 'core',
  },
];

export const CORE_SETTINGS_ICONS: Record<string, string> = {
  'core.club': 'Settings',
  'core.order': 'ShoppingCart',
};

export const CORE_SETTINGS_SORT: Record<string, number> = {
  'core.club': 1,
  'core.order': 2,
  'module.notifications': 3,
};

export const CORE_SETTINGS_PARENT = 'settings';

/** Settings shown under Einstellungen for volunteer admins (no technical namespaces). */
export const CORE_VOLUNTEER_SETTINGS_NAMESPACES = [
  'core.club',
  'core.order',
  'module.notifications',
] as const;

/** Dashboard tiles for day-to-day tenant administration. */
export const CORE_VOLUNTEER_DASHBOARD_PATHS = new Set([
  '/admin/veranstaltungen',
  '/admin/speisen',
  '/admin/benutzer',
  '/admin/module',
  '/admin/verein',
  '/admin/bestellung',
  '/admin/settings/module.notifications',
  '/service',
]);

export const CORE_STAFF_LINK: AdminDashboardTile = {
  id: 'staff-area',
  label: 'Service',
  description: 'Küche, Abholung, Bestellungen',
  path: '/service',
  icon: 'Storefront',
  sortOrder: 1000,
  source: 'core',
};

/** @deprecated Use CoreAdminMetadataRegistry via registerCoreAdminMetadata() */
export function coreBuiltinNavigation(): AdminNavItem[] {
  return CORE_BUILTIN_PAGES.filter((p) => p.pageType !== 'dashboard').map((p) => ({
    id: p.id,
    label: p.label,
    path: p.path,
    icon: p.icon,
    sortOrder: p.sortOrder,
    source: 'core' as const,
  }));
}

export function registerCoreAdminMetadata(registry: CoreAdminMetadataRegistry): void {
  registry.register({
    builtinPages: CORE_BUILTIN_PAGES,
    settingsIcons: CORE_SETTINGS_ICONS,
    settingsSort: CORE_SETTINGS_SORT,
    staffDashboardTile: CORE_STAFF_LINK,
  });
}
