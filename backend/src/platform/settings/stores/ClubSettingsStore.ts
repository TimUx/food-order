import { clubRepository } from '../../../repositories/clubRepository';
import { requireTenantId } from '../../tenant/tenantScope';
import {
  pickOrganizationFields,
  syncClubOrganizationToTenant,
} from '../../tenant/syncClubOrganizationToTenant';
import {
  CORE_CLUB_NAMESPACE,
  CORE_EMAIL_NAMESPACE,
  CORE_ORDER_NAMESPACE,
} from '../SettingsNamespaces';
import type { SettingsStore } from '../types';
import { getByPath } from '../pathUtils';

const CLUB_FIELDS = [
  'clubName',
  'description',
  'contactName',
  'email',
  'phone',
  'address',
  'website',
  'logoUrl',
] as const;

const ORDER_FIELDS = [
  'orderFieldFirstNameRequired',
  'orderFieldLastNameRequired',
  'orderFieldEmailRequired',
  'orderFieldPhoneRequired',
  'cancellationDeadlineHours',
  'cancellationDeadlineUnit',
] as const;

const EMAIL_FIELDS = [
  'smtpHost',
  'smtpPort',
  'smtpUser',
  'smtpPass',
  'smtpFrom',
  'emailCustomText',
] as const;

const NAMESPACE_FIELDS: Record<string, readonly string[]> = {
  [CORE_CLUB_NAMESPACE]: CLUB_FIELDS,
  [CORE_ORDER_NAMESPACE]: ORDER_FIELDS,
  [CORE_EMAIL_NAMESPACE]: EMAIL_FIELDS,
};

export class ClubSettingsStore implements SettingsStore {
  supports(namespace: string): boolean {
    return namespace in NAMESPACE_FIELDS;
  }

  async load(namespace: string): Promise<Record<string, unknown>> {
    const row = await clubRepository.get();
    const fields = NAMESPACE_FIELDS[namespace];
    const values: Record<string, unknown> = {};
    for (const key of fields) {
      values[key] = (row as Record<string, unknown>)[key];
    }
    return values;
  }

  async save(namespace: string, values: Record<string, unknown>): Promise<void> {
    const fields = NAMESPACE_FIELDS[namespace];
    if (!fields) throw new Error(`Unsupported namespace: ${namespace}`);

    const update: Record<string, unknown> = {};
    for (const key of fields) {
      if (getByPath(values, key) !== undefined) {
        update[key] = getByPath(values, key);
      }
    }

    await clubRepository.update(update as Parameters<typeof clubRepository.update>[0]);

    if (namespace === CORE_CLUB_NAMESPACE) {
      const tenantId = requireTenantId();
      await syncClubOrganizationToTenant(tenantId, pickOrganizationFields(update));

      const { clubService } = await import('../../../services/clubService');
      const { emitClubUpdate } = await import('../../../socket');
      emitClubUpdate(await clubService.getPublic());
    }
  }
}
