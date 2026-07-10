import type { SettingsFormDefinition, SettingsSchemaDefinition } from './types';
import { getByPath } from './pathUtils';
import { decryptValue, isEncryptedValue, maskValue } from './SettingsEncryption';

export class FormGenerator {
  generate(
    schema: SettingsSchemaDefinition,
    values: Record<string, unknown>,
    options: { decrypt?: boolean } = {}
  ): SettingsFormDefinition {
    const groupMap = new Map(schema.groups.map((g) => [g.id, g]));
    const fieldsByGroup = new Map<string, SettingsFormDefinition['groups'][0]['fields']>();

    for (const field of schema.fields) {
      const raw = getByPath(values, field.key);
      let value = raw;
      let masked = false;

      if (field.encrypted && typeof raw === 'string' && raw) {
        if (options.decrypt) {
          value = isEncryptedValue(raw) ? decryptValue(raw) : raw;
        } else {
          const plain = isEncryptedValue(raw) ? decryptValue(raw) : raw;
          value = maskValue(plain);
          masked = true;
        }
      } else if (value === undefined && field.default !== undefined) {
        value = field.default;
      }

      const list = fieldsByGroup.get(field.group) ?? [];
      list.push({ ...field, value, masked });
      fieldsByGroup.set(field.group, list);
    }

    const groups = Array.from(fieldsByGroup.entries()).map(([groupId, fields]) => {
      const meta = groupMap.get(groupId);
      return {
        id: groupId,
        label: meta?.label ?? groupId,
        description: meta?.description,
        advanced: meta?.advanced,
        fields,
      };
    });

    return {
      namespace: schema.namespace,
      label: schema.label,
      description: schema.description,
      adminPath: schema.adminPath,
      groups,
    };
  }
}
