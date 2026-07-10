export const SETTINGS_FIELD_TYPES = [
  'string',
  'text',
  'number',
  'boolean',
  'password',
  'email',
  'select',
  'url',
] as const;

export type SettingsFieldType = (typeof SETTINGS_FIELD_TYPES)[number];

export interface SettingsFieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  enum?: string[];
}

export interface SettingsSelectOption {
  value: string;
  label: string;
}

/** Metadata for a single settings field – modules register exclusively via this. */
export interface SettingsFieldMetadata {
  key: string;
  group: string;
  label: string;
  description?: string;
  type: SettingsFieldType;
  default?: unknown;
  required?: boolean;
  encrypted?: boolean;
  validation?: SettingsFieldValidation;
  helpText?: string;
  options?: SettingsSelectOption[];
}

export interface SettingsGroupMetadata {
  id: string;
  label: string;
  description?: string;
  /** Shown under "Erweitert" in volunteer-first admin forms */
  advanced?: boolean;
}

export interface SettingsSchemaDefinition {
  namespace: string;
  label: string;
  description?: string;
  permission?: string;
  adminPath?: string;
  groups: SettingsGroupMetadata[];
  fields: SettingsFieldMetadata[];
}

export interface SettingsFormField extends SettingsFieldMetadata {
  value?: unknown;
  masked?: boolean;
}

export interface SettingsFormGroup {
  id: string;
  label: string;
  description?: string;
  advanced?: boolean;
  fields: SettingsFormField[];
}

export interface SettingsFormDefinition {
  namespace: string;
  label: string;
  description?: string;
  adminPath?: string;
  groups: SettingsFormGroup[];
}

export interface SettingsNamespaceInfo {
  namespace: string;
  label: string;
  description?: string;
  adminPath?: string;
  permission?: string;
  groupCount: number;
  fieldCount: number;
}

export interface SettingsGetOptions {
  /** Return decrypted secrets (internal use). Default: masked for API. */
  decrypt?: boolean;
  /** Skip cache. */
  fresh?: boolean;
}

export interface SettingsSetOptions {
  actorId?: string;
  partial?: boolean;
}

export interface SettingsStore {
  load(namespace: string): Promise<Record<string, unknown>>;
  save(namespace: string, values: Record<string, unknown>): Promise<void>;
  supports(namespace: string): boolean;
}
