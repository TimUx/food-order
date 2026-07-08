import { z } from 'zod';

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
  minimumCoreVersion: z.string().default('1.0.0'),
});

export type ModuleManifest = z.infer<typeof moduleManifestSchema>;

export type ModuleStatus =
  | 'AVAILABLE'
  | 'INSTALLED'
  | 'ACTIVATED'
  | 'DISABLED'
  | 'UNINSTALLED';

export const MODULE_STATUS_LABELS: Record<ModuleStatus, string> = {
  AVAILABLE: 'Verfügbar',
  INSTALLED: 'Installiert',
  ACTIVATED: 'Aktiviert',
  DISABLED: 'Deaktiviert',
  UNINSTALLED: 'Deinstalliert',
};

export const CORE_VERSION = '1.0.0';
