import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import type { TenantSettingsRecord } from './types';
import type { TenantSettingsService } from './TenantSettingsService';
import { TENANT_SETTINGS_NAMESPACES } from './TenantSettingsService';
import { TenantRepository } from '../../repositories/tenantRepository';

export class TenantSettingsServiceImpl implements TenantSettingsService {
  private readonly tenantRepository = new TenantRepository();

  async getSettings(tenantId: string): Promise<TenantSettingsRecord> {
    const row = await this.tenantRepository.ensureSettings(tenantId);
    return {
      orderFieldFirstNameRequired: row.orderFieldFirstNameRequired,
      orderFieldLastNameRequired: row.orderFieldLastNameRequired,
      orderFieldEmailRequired: row.orderFieldEmailRequired,
      orderFieldPhoneRequired: row.orderFieldPhoneRequired,
      cancellationDeadlineHours: row.cancellationDeadlineHours,
      cancellationDeadlineUnit: row.cancellationDeadlineUnit,
      dataRetentionDays: row.dataRetentionDays,
    };
  }

  async updateSettings(
    tenantId: string,
    values: Partial<TenantSettingsRecord>
  ): Promise<TenantSettingsRecord> {
    await prisma.tenantSettings.update({
      where: { tenantId },
      data: values,
    });
    return this.getSettings(tenantId);
  }

  async getNamespaceValues(tenantId: string, namespace: string): Promise<Record<string, unknown>> {
    if (namespace === TENANT_SETTINGS_NAMESPACES.ORDER) {
      const s = await this.getSettings(tenantId);
      return {
        orderFieldFirstNameRequired: s.orderFieldFirstNameRequired,
        orderFieldLastNameRequired: s.orderFieldLastNameRequired,
        orderFieldEmailRequired: s.orderFieldEmailRequired,
        orderFieldPhoneRequired: s.orderFieldPhoneRequired,
        cancellationDeadlineHours: s.cancellationDeadlineHours,
        cancellationDeadlineUnit: s.cancellationDeadlineUnit,
        dataRetentionDays: s.dataRetentionDays,
      };
    }

    if (namespace === TENANT_SETTINGS_NAMESPACES.ORGANIZATION) {
      const tenant = await this.tenantRepository.findById(tenantId);
      if (!tenant) return {};
      return {
        clubName: tenant.name,
        shortName: tenant.shortName,
        description: tenant.description,
        contactName: tenant.contactName,
        email: tenant.email,
        phone: tenant.phone,
        address: tenant.address,
        website: tenant.website,
        logoUrl: tenant.logoUrl,
        locale: tenant.locale,
        timezone: tenant.timezone,
        currency: tenant.currency,
        theme: tenant.theme,
      };
    }

    if (namespace.startsWith('tenant.module.')) {
      const moduleId = namespace.slice('tenant.module.'.length);
      const row = await prisma.tenantModule.findUnique({
        where: { tenantId_moduleId: { tenantId, moduleId } },
      });
      return (row?.configJson as Record<string, unknown>) ?? {};
    }

    logger.warn('TenantSettingsService: unbekannter Namespace', { tenant_id: tenantId, namespace });
    return {};
  }

  async setNamespaceValues(
    tenantId: string,
    namespace: string,
    values: Record<string, unknown>
  ): Promise<void> {
    if (namespace === TENANT_SETTINGS_NAMESPACES.ORDER) {
      await this.updateSettings(tenantId, values as Partial<TenantSettingsRecord>);
      return;
    }

    if (namespace === TENANT_SETTINGS_NAMESPACES.ORGANIZATION) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          name: values.clubName as string | undefined,
          shortName: values.shortName as string | null | undefined,
          description: values.description as string | null | undefined,
          contactName: values.contactName as string | null | undefined,
          email: values.email as string | null | undefined,
          phone: values.phone as string | null | undefined,
          address: values.address as string | null | undefined,
          website: values.website as string | null | undefined,
          logoUrl: values.logoUrl as string | null | undefined,
          locale: values.locale as string | undefined,
          timezone: values.timezone as string | undefined,
          currency: values.currency as string | undefined,
          theme: values.theme as string | undefined,
        },
      });
      return;
    }

    if (namespace.startsWith('tenant.module.')) {
      const moduleId = namespace.slice('tenant.module.'.length);
      const existing = await prisma.tenantModule.findUnique({
        where: { tenantId_moduleId: { tenantId, moduleId } },
      });
      if (!existing) {
        throw new Error(`Modul ${moduleId} ist für Mandant ${tenantId} nicht installiert`);
      }
      await prisma.tenantModule.update({
        where: { tenantId_moduleId: { tenantId, moduleId } },
        data: { configJson: values as object },
      });
    }
  }
}
