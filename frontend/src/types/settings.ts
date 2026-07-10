export type SettingsFieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'boolean'
  | 'password'
  | 'email'
  | 'select'
  | 'url';

export interface SettingsFormField {
  key: string;
  group: string;
  label: string;
  description?: string;
  type: SettingsFieldType;
  default?: unknown;
  required?: boolean;
  encrypted?: boolean;
  helpText?: string;
  options?: { value: string; label: string }[];
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

export function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') current[part] = {};
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

export function buildValuesPayload(groups: SettingsFormGroup[]): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const group of groups) {
    for (const field of group.fields) {
      if (field.value !== undefined) {
        setByPath(payload, field.key, field.value);
      }
    }
  }
  return payload;
}
