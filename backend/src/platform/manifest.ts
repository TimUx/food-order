import { z } from 'zod';

const menuMetadataSchema = z.object({
  id: z.string(),
  label: z.string(),
  path: z.string(),
  icon: z.string().optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().optional(),
  requiredPermission: z.string().optional(),
});

const widgetMetadataSchema = z.object({
  id: z.string(),
  title: z.string(),
  componentId: z.string(),
  sortOrder: z.number().optional(),
});

const reportMetadataSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  path: z.string().optional(),
  icon: z.string().optional(),
  componentId: z.string(),
  sortOrder: z.number().optional(),
  requiredPermission: z.string().optional(),
});

const developerPageMetadataSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  path: z.string().optional(),
  icon: z.string().optional(),
  componentId: z.string(),
  sortOrder: z.number().optional(),
  requiredPermission: z.string().optional(),
});

const healthCheckMetadataSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
});

const routeMetadataSchema = z.object({
  mountPath: z.string().default('/'),
  webhook: z.boolean().default(false),
  public: z.boolean().default(false),
});

const settingsFieldSchema = z.object({
  key: z.string(),
  group: z.string(),
  label: z.string(),
  description: z.string().optional(),
  type: z.enum(['string', 'text', 'number', 'boolean', 'password', 'email', 'select', 'url']),
  default: z.unknown().optional(),
  required: z.boolean().optional(),
  encrypted: z.boolean().optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    enum: z.array(z.string()).optional(),
  }).optional(),
  helpText: z.string().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
});

const settingsGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  advanced: z.boolean().optional(),
});

const settingsMetadataSchema = z.object({
  namespace: z.string().optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  adminPath: z.string().optional(),
  configKey: z.string().optional(),
  permission: z.string().optional(),
  groups: z.array(settingsGroupSchema).default([]),
  fields: z.array(settingsFieldSchema).default([]),
});

const qaMetadataSchema = z.object({
  participatesInScenarios: z.boolean().default(true),
  providesSeed: z.boolean().default(false),
  integrationTest: z.string().optional(),
  apiTest: z.string().optional(),
}).optional();

export const moduleManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+/),
  author: z.string(),
  homepage: z.string().url().optional().or(z.literal('')),
  license: z.string().default('MIT'),
  entry: z.string().default('index'),
  dependencies: z.object({
    required: z.array(z.string()).default([]),
    optional: z.array(z.string()).default([]),
  }).default({ required: [], optional: [] }),
  permissions: z.array(z.object({
    key: z.string(),
    description: z.string(),
  })).default([]),
  menus: z.array(menuMetadataSchema).default([]),
  widgets: z.array(widgetMetadataSchema).default([]),
  reports: z.array(reportMetadataSchema).default([]),
  developerPages: z.array(developerPageMetadataSchema).default([]),
  healthChecks: z.array(healthCheckMetadataSchema).default([]),
  routes: z.array(routeMetadataSchema).default([]),
  settings: settingsMetadataSchema.optional(),
  qa: qaMetadataSchema,
  minimumCoreVersion: z.string().default('1.0.0'),
  productionReady: z.boolean().default(false),
});

export type ModuleManifest = z.infer<typeof moduleManifestSchema>;

export type ModuleStatus =
  | 'AVAILABLE'
  | 'INSTALLED'
  | 'ENABLED'
  | 'DISABLED'
  | 'UPGRADING'
  | 'FAILED';

/** @deprecated Use ENABLED */
export type LegacyModuleStatus = 'ACTIVATED' | 'UNINSTALLED';

export const MODULE_STATUS_LABELS: Record<ModuleStatus, string> = {
  AVAILABLE: 'Verfügbar',
  INSTALLED: 'Installiert',
  ENABLED: 'Aktiviert',
  DISABLED: 'Deaktiviert',
  UPGRADING: 'Upgrade läuft',
  FAILED: 'Fehler',
};

export const CORE_VERSION = '2.2.0';
