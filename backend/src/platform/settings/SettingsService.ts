import { AppError } from '../../middleware/errorHandler';
import type { AuditService } from '../AuditService';
import type { FormGenerator } from './FormGenerator';
import type { SchemaRegistry } from './SchemaRegistry';
import type { SettingsCache } from './SettingsCache';
import type { SettingsValidation } from './SettingsValidation';
import type {
  SettingsFormDefinition,
  SettingsGetOptions,
  SettingsNamespaceInfo,
  SettingsSchemaDefinition,
  SettingsSetOptions,
  SettingsStore,
} from './types';
import { getByPath, setByPath } from './pathUtils';
import {
  decryptValue,
  encryptValue,
  isEncryptedValue,
  isMaskedInput,
  maskValue,
} from './SettingsEncryption';
import { CORE_HOOKS } from '../types';
import type { HookSystem } from '../HookSystem';
import { tenantCacheKey } from '../tenant/tenantModuleHelpers';

export class SettingsService {
  constructor(
    private readonly schemaRegistry: SchemaRegistry,
    private readonly validation: SettingsValidation,
    private readonly cache: SettingsCache,
    private readonly formGenerator: FormGenerator,
    private readonly stores: SettingsStore[],
    private readonly auditService: AuditService,
    private readonly hookSystem: HookSystem
  ) {}

  registerSchema(definition: SettingsSchemaDefinition): void {
    this.schemaRegistry.registerOrReplace(definition);
  }

  listNamespaces(): SettingsNamespaceInfo[] {
    return this.schemaRegistry.list();
  }

  getSchema(namespace: string): SettingsSchemaDefinition {
    const schema = this.schemaRegistry.get(namespace);
    if (!schema) throw new AppError(404, `Einstellungs-Namespace nicht gefunden: ${namespace}`);
    return schema;
  }

  async getForm(namespace: string, options: SettingsGetOptions = {}): Promise<SettingsFormDefinition> {
    const values = await this.getValues(namespace, options);
    return this.formGenerator.generate(this.getSchema(namespace), values, {
      decrypt: options.decrypt,
    });
  }

  async getValues(namespace: string, options: SettingsGetOptions = {}): Promise<Record<string, unknown>> {
    const cacheKey = tenantCacheKey(namespace);
    if (!options.fresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) return this.sanitizeForOutput(namespace, structuredClone(cached), options);
    }

    const store = this.getStore(namespace);
    const raw = await store.load(namespace);
    const withDefaults = this.applyDefaults(namespace, raw);
    this.cache.set(cacheKey, withDefaults);
    return this.sanitizeForOutput(namespace, withDefaults, options);
  }

  async getDecryptedValues(namespace: string): Promise<Record<string, unknown>> {
    return this.getValues(namespace, { decrypt: true, fresh: true });
  }

  async setValues(
    namespace: string,
    incoming: Record<string, unknown>,
    options: SettingsSetOptions = {}
  ): Promise<Record<string, unknown>> {
    const schema = this.getSchema(namespace);
    const store = this.getStore(namespace);
    const current = await this.getDecryptedValues(namespace);
    const merged = options.partial !== false
      ? this.mergeValues(schema, current, incoming)
      : this.replaceValues(schema, incoming);

    this.prepareEncryptedFields(schema, merged, current);
    this.applyDefaults(namespace, merged);
    this.validation.validate(schema, merged);

    await store.save(namespace, this.toStorageShape(namespace, merged));
    this.cache.invalidate(tenantCacheKey(namespace));

    await this.auditService.log({
      action: 'settings.updated',
      actorId: options.actorId,
      moduleId: namespace.startsWith('module.') ? namespace.slice('module.'.length) : undefined,
      details: { namespace, keys: Object.keys(incoming) },
    });

    await this.hookSystem.emit(CORE_HOOKS.SETTINGS_CHANGED, { namespace, values: merged });

    return this.sanitizeForOutput(namespace, merged, {});
  }

  private getStore(namespace: string): SettingsStore {
    const store = this.stores.find((s) => s.supports(namespace));
    if (!store) throw new AppError(404, `Kein Settings-Store für Namespace: ${namespace}`);
    return store;
  }

  private applyDefaults(namespace: string, values: Record<string, unknown>): Record<string, unknown> {
    const schema = this.schemaRegistry.get(namespace);
    if (!schema) return values;

    for (const field of schema.fields) {
      if (getByPath(values, field.key) === undefined && field.default !== undefined) {
        setByPath(values, field.key, field.default);
      }
    }
    return values;
  }

  private mergeValues(
    schema: SettingsSchemaDefinition,
    current: Record<string, unknown>,
    incoming: Record<string, unknown>
  ): Record<string, unknown> {
    const merged = structuredClone(current);
    for (const field of schema.fields) {
      const next = getByPath(incoming, field.key);
      if (next !== undefined) {
        setByPath(merged, field.key, next);
      }
    }
    return merged;
  }

  private replaceValues(
    schema: SettingsSchemaDefinition,
    incoming: Record<string, unknown>
  ): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    for (const field of schema.fields) {
      const next = getByPath(incoming, field.key);
      if (next !== undefined) setByPath(values, field.key, next);
    }
    return values;
  }

  private prepareEncryptedFields(
    schema: SettingsSchemaDefinition,
    merged: Record<string, unknown>,
    current: Record<string, unknown>
  ): void {
    for (const field of schema.fields) {
      if (!field.encrypted) continue;
      const next = getByPath(merged, field.key);
      const prev = getByPath(current, field.key);

      if (next === undefined || next === null || next === '') {
        if (prev !== undefined) setByPath(merged, field.key, prev);
        continue;
      }

      if (isMaskedInput(next)) {
        setByPath(merged, field.key, prev ?? '');
        continue;
      }

      const str = String(next);
      if (isEncryptedValue(str)) {
        setByPath(merged, field.key, str);
        continue;
      }

      setByPath(merged, field.key, encryptValue(str));
    }
  }

  private sanitizeForOutput(
    namespace: string,
    values: Record<string, unknown>,
    options: SettingsGetOptions
  ): Record<string, unknown> {
    const schema = this.schemaRegistry.get(namespace);
    if (!schema) return values;

    const output = structuredClone(values);
    for (const field of schema.fields) {
      if (!field.encrypted) continue;
      const raw = getByPath(output, field.key);
      if (typeof raw !== 'string' || !raw) continue;

      if (options.decrypt) {
        setByPath(output, field.key, isEncryptedValue(raw) ? decryptValue(raw) : raw);
      } else {
        const plain = isEncryptedValue(raw) ? decryptValue(raw) : raw;
        setByPath(output, field.key, maskValue(plain));
      }
    }
    return output;
  }

  private toStorageShape(namespace: string, values: Record<string, unknown>): Record<string, unknown> {
    if (namespace.startsWith('module.')) {
      return values;
    }
    const flat: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
      flat[key] = value;
    }
    return flat;
  }
}
