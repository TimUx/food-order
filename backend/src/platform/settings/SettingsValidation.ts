import { AppError } from '../../middleware/errorHandler';
import type { SettingsFieldMetadata, SettingsSchemaDefinition } from './types';
import { getByPath } from './pathUtils';
import { CORE_ORDER_NAMESPACE } from './SettingsNamespaces';

export class SettingsValidation {
  validate(schema: SettingsSchemaDefinition, values: Record<string, unknown>): void {
    const errors: string[] = [];

    for (const field of schema.fields) {
      const value = getByPath(values, field.key);
      const err = this.validateField(field, value);
      if (err) errors.push(err);
    }

    if (schema.namespace === CORE_ORDER_NAMESPACE) {
      const deadlineErr = this.validateCancellationDeadline(values);
      if (deadlineErr) errors.push(deadlineErr);
    }

    if (errors.length > 0) {
      throw new AppError(400, `Einstellungen ungültig: ${errors.join('; ')}`);
    }
  }

  private validateField(field: SettingsFieldMetadata, value: unknown): string | null {
    const isEmpty = value === undefined || value === null || value === '';

    if (field.required && isEmpty) {
      return `${field.label} ist erforderlich`;
    }

    if (isEmpty) return null;

    switch (field.type) {
      case 'number': {
        const num = typeof value === 'number' ? value : Number(value);
        if (Number.isNaN(num)) return `${field.label} muss eine Zahl sein`;
        if (field.validation?.min !== undefined && num < field.validation.min) {
          return `${field.label} muss mindestens ${field.validation.min} sein`;
        }
        if (field.validation?.max !== undefined && num > field.validation.max) {
          return `${field.label} darf höchstens ${field.validation.max} sein`;
        }
        break;
      }
      case 'boolean':
        if (typeof value !== 'boolean') return `${field.label} muss true/false sein`;
        break;
      case 'email': {
        const str = String(value);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return `${field.label} ist keine gültige E-Mail`;
        break;
      }
      case 'select': {
        const str = String(value);
        const allowed = field.validation?.enum ?? field.options?.map((o) => o.value) ?? [];
        if (allowed.length > 0 && !allowed.includes(str)) {
          return `${field.label} hat einen ungültigen Wert`;
        }
        break;
      }
      default: {
        const str = String(value);
        if (field.validation?.min !== undefined && str.length < field.validation.min) {
          return `${field.label} ist zu kurz`;
        }
        if (field.validation?.max !== undefined && str.length > field.validation.max) {
          return `${field.label} ist zu lang`;
        }
        if (field.validation?.pattern) {
          const re = new RegExp(field.validation.pattern);
          if (!re.test(str)) return `${field.label} entspricht nicht dem erwarteten Format`;
        }
        if (field.validation?.enum && !field.validation.enum.includes(str)) {
          return `${field.label} hat einen ungültigen Wert`;
        }
      }
    }

    return null;
  }

  private validateCancellationDeadline(values: Record<string, unknown>): string | null {
    const unit = String(values.cancellationDeadlineUnit ?? 'hours');
    const value = Number(values.cancellationDeadlineHours ?? 0);
    if (Number.isNaN(value) || value < 0) {
      return 'Stornierungsfrist muss mindestens 0 sein';
    }
    if (!['hours', 'days'].includes(unit)) {
      return 'Ungültige Einheit für die Stornierungsfrist';
    }
    if (unit === 'days' && value > 30) {
      return 'Stornierungsfrist darf höchstens 30 Tage betragen';
    }
    if (unit === 'hours' && value > 720) {
      return 'Stornierungsfrist darf höchstens 720 Stunden betragen';
    }
    return null;
  }
}
