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
  | 'ACTIVATED'
  | 'DISABLED'
  | 'UNINSTALLED';

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
  dependencies: {
    required: string[];
    optional: string[];
  };
  minimumCoreVersion: string;
  installedAt?: string;
  lastHealthStatus?: string;
  lastHealthCheck?: string;
  upgradeAvailable: boolean;
}

export interface ModuleHealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  message?: string;
  details?: Record<string, unknown>;
}

export const MODULE_STATUS_LABELS: Record<ModuleStatus, string> = {
  AVAILABLE: 'Verfügbar',
  INSTALLED: 'Installiert',
  ACTIVATED: 'Aktiviert',
  DISABLED: 'Deaktiviert',
  UNINSTALLED: 'Deinstalliert',
};
