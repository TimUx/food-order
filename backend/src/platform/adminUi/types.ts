export type AdminPageType =
  | 'dashboard'
  | 'settings'
  | 'builtin'
  | 'modules'
  | 'report'
  | 'developer';

export type AdminMetadataSource = 'core' | 'module';

export interface AdminNavItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  parentId?: string;
  sortOrder?: number;
  requiredPermission?: string;
  source: AdminMetadataSource;
  moduleId?: string;
}

export interface AdminPageDefinition {
  id: string;
  label: string;
  description?: string;
  path: string;
  icon?: string;
  pageType: AdminPageType;
  sortOrder?: number;
  parentId?: string;
  requiredPermission?: string;
  source: AdminMetadataSource;
  moduleId?: string;
  namespace?: string;
  componentId?: string;
  reportId?: string;
}

export interface AdminDashboardTile {
  id: string;
  label: string;
  description?: string;
  path: string;
  icon?: string;
  sortOrder?: number;
  source: AdminMetadataSource;
  moduleId?: string;
}

export interface AdminWidgetDefinition {
  id: string;
  title: string;
  componentId: string;
  sortOrder?: number;
  moduleId?: string;
}

export interface AdminHealthDefinition {
  id: string;
  moduleId: string;
  label: string;
  description?: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheck?: string;
  message?: string;
}

export interface AdminReportDefinition {
  id: string;
  label: string;
  description?: string;
  path: string;
  icon?: string;
  componentId: string;
  sortOrder?: number;
  requiredPermission?: string;
  moduleId: string;
}

export interface AdminDeveloperPageDefinition {
  id: string;
  label: string;
  description?: string;
  path: string;
  icon?: string;
  componentId: string;
  sortOrder?: number;
  requiredPermission?: string;
  moduleId: string;
}

export interface AdminTechnicalDetails {
  health: AdminHealthDefinition[];
}

export interface AdminUiCatalog {
  navigation: AdminNavItem[];
  pages: AdminPageDefinition[];
  dashboardTiles: AdminDashboardTile[];
  widgets: AdminWidgetDefinition[];
  /** @deprecated Use technicalDetails.health – kept empty in volunteer-first catalog */
  health: AdminHealthDefinition[];
  technicalDetails?: AdminTechnicalDetails;
  reports: AdminReportDefinition[];
  developerPages: AdminDeveloperPageDefinition[];
}
