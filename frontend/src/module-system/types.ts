export interface ModuleMenuItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  parentId?: string;
  sortOrder?: number;
  requiredPermission?: string;
}

export type ModuleStatus =
  | 'AVAILABLE'
  | 'INSTALLED'
  | 'ENABLED'
  | 'DISABLED'
  | 'UPGRADING'
  | 'FAILED';

export interface ModuleInfo {
  id: string;
  name: string;
  version: string;
  imageVersion: string;
  description: string;
  author: string;
  homepage?: string;
  license: string;
  status: ModuleStatus;
  installed: boolean;
  enabled: boolean;
  flags: {
    enabled: boolean;
    disabled: boolean;
    configurable: boolean;
    visible: boolean;
    health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  };
  permissions: { key: string; description: string }[];
  menuItems: ModuleMenuItem[];
  widgets: { id: string; title: string; componentId: string }[];
  hasConfig: boolean;
  settingsPath?: string;
  dependencies: {
    required: string[];
    optional: string[];
  };
  minimumCoreVersion: string;
  installedAt?: string;
  installedVersion?: string;
  lastHealthStatus?: string;
  lastHealthCheck?: string;
  lastError?: string;
  schemaVersion?: string;
  upgradeAvailable: boolean;
  dependencyStatus?: {
    satisfied: boolean;
    missing: string[];
    inactive: string[];
  };
  /** Vom Plattform-Admin für diesen Mandanten freigegeben */
  entitled?: boolean;
}

export interface ModuleHealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  message?: string;
  details?: Record<string, unknown>;
}

export const MODULE_STATUS_LABELS: Record<ModuleStatus, string> = {
  AVAILABLE: 'Verfügbar',
  INSTALLED: 'Installiert',
  ENABLED: 'Aktiviert',
  DISABLED: 'Deaktiviert',
  UPGRADING: 'Upgrade läuft',
  FAILED: 'Fehler',
};
