import { clubRepository, DEFAULT_CLUB } from '../repositories/clubRepository';
import { emitClubUpdate } from '../socket';
import { hookSystem } from '../platform/bootstrap';
import { CORE_HOOKS } from '../platform/types';
import { settingsService } from '../platform/bootstrap';
import { getInstalledModuleIds } from '../core/settings/assertModuleSettingsAccessible';
import {
  CORE_CLUB_NAMESPACE,
  CORE_EMAIL_NAMESPACE,
  CORE_ORDER_NAMESPACE,
  moduleSettingsNamespace,
} from '../platform/settings/SettingsNamespaces';
import { getByPath } from '../platform/settings/pathUtils';

type ClubSettingsRow = Awaited<ReturnType<typeof clubRepository.get>>;

function mapClub(values: Record<string, unknown>) {
  return {
    clubName: String(values.clubName ?? DEFAULT_CLUB.clubName),
    description: (values.description as string | null) ?? DEFAULT_CLUB.description,
    contactName: (values.contactName as string | null) ?? DEFAULT_CLUB.contactName,
    email: (values.email as string | null) ?? DEFAULT_CLUB.email,
    phone: (values.phone as string | null) ?? DEFAULT_CLUB.phone,
    address: (values.address as string | null) ?? DEFAULT_CLUB.address,
    website: (values.website as string | null) ?? DEFAULT_CLUB.website,
    logoUrl: values.logoUrl as string | null | undefined,
    orderFieldFirstNameRequired: Boolean(values.orderFieldFirstNameRequired ?? true),
    orderFieldLastNameRequired: Boolean(values.orderFieldLastNameRequired ?? true),
    orderFieldEmailRequired: Boolean(values.orderFieldEmailRequired ?? false),
    orderFieldPhoneRequired: Boolean(values.orderFieldPhoneRequired ?? false),
    cancellationDeadlineHours: Number(values.cancellationDeadlineHours ?? 24),
    cancellationDeadlineUnit: String(values.cancellationDeadlineUnit ?? 'hours'),
  };
}

export function mapOrderFieldConfig(settings: ClubSettingsRow) {
  return {
    firstNameRequired: settings.orderFieldFirstNameRequired,
    lastNameRequired: settings.orderFieldLastNameRequired,
    emailRequired: settings.orderFieldEmailRequired,
    phoneRequired: settings.orderFieldPhoneRequired,
  };
}

export function mapEmailSettings(values: Record<string, unknown>) {
  const smtpPass = values.smtpPass ?? getByPath(values, 'smtp.pass');
  const smtpHost = values.smtpHost ?? getByPath(values, 'smtp.host');
  const smtpPort = values.smtpPort ?? getByPath(values, 'smtp.port');
  const smtpUser = values.smtpUser ?? getByPath(values, 'smtp.user');
  const smtpFrom = values.smtpFrom ?? getByPath(values, 'smtp.from');
  const smtpEnabled = values.smtpEnabled ?? getByPath(values, 'smtp.enabled');
  return {
    smtpHost: String(smtpHost ?? ''),
    smtpPort: Number(smtpPort ?? 587),
    smtpUser: String(smtpUser ?? ''),
    smtpFrom: String(smtpFrom ?? ''),
    smtpPassConfigured: Boolean(smtpPass),
    smtpEnabled: Boolean(smtpEnabled ?? String(smtpHost ?? '').trim()),
    emailCustomText: String(values.emailCustomText ?? ''),
  };
}

async function usesNotificationsModule(): Promise<boolean> {
  const installed = await getInstalledModuleIds();
  return installed.has('notifications');
}

export const clubService = {
  async getSettings() {
    const club = await settingsService.getDecryptedValues(CORE_CLUB_NAMESPACE);
    const order = await settingsService.getDecryptedValues(CORE_ORDER_NAMESPACE);
    const email = (await usesNotificationsModule())
      ? await settingsService.getDecryptedValues(moduleSettingsNamespace('notifications'))
      : await settingsService.getDecryptedValues(CORE_EMAIL_NAMESPACE);
    return { ...club, ...order, ...email } as Awaited<ReturnType<typeof clubRepository.get>>;
  },

  async getPublic() {
    const values = await settingsService.getDecryptedValues(CORE_CLUB_NAMESPACE);
    const order = await settingsService.getDecryptedValues(CORE_ORDER_NAMESPACE);
    return mapClub({ ...values, ...order });
  },

  async getOrderSettings() {
    const order = await settingsService.getDecryptedValues(CORE_ORDER_NAMESPACE);
    return {
      fields: {
        firstNameRequired: Boolean(order.orderFieldFirstNameRequired ?? true),
        lastNameRequired: Boolean(order.orderFieldLastNameRequired ?? true),
        emailRequired: Boolean(order.orderFieldEmailRequired ?? false),
        phoneRequired: Boolean(order.orderFieldPhoneRequired ?? false),
      },
      cancellationDeadlineHours: Number(order.cancellationDeadlineHours ?? 24),
      cancellationDeadlineUnit: String(order.cancellationDeadlineUnit ?? 'hours'),
    };
  },

  async getEmailSettings() {
    if (await usesNotificationsModule()) {
      const values = await settingsService.getValues(moduleSettingsNamespace('notifications'));
      return mapEmailSettings(values);
    }
    const values = await settingsService.getValues(CORE_EMAIL_NAMESPACE);
    return mapEmailSettings(values);
  },

  async updateEmailSettings(data: Record<string, unknown>) {
    if (await usesNotificationsModule()) {
      const smtp: Record<string, unknown> = {};
      if (data.smtpHost !== undefined) smtp.host = data.smtpHost;
      if (data.smtpPort !== undefined) smtp.port = data.smtpPort;
      if (data.smtpUser !== undefined) smtp.user = data.smtpUser;
      if (data.smtpPass !== undefined) smtp.pass = data.smtpPass;
      if (data.smtpFrom !== undefined) smtp.from = data.smtpFrom;
      if (Object.keys(smtp).length > 0) smtp.enabled = true;

      const patch: Record<string, unknown> = {};
      if (Object.keys(smtp).length > 0) patch.smtp = smtp;
      if (data.emailCustomText !== undefined) patch.emailCustomText = data.emailCustomText;

      const settings = await settingsService.setValues(
        moduleSettingsNamespace('notifications'),
        patch,
        { partial: true }
      );
      const mapped = mapEmailSettings(settings);
      hookSystem.emitAsync(CORE_HOOKS.SETTINGS_CHANGED, { type: 'email', settings: mapped });
      return mapped;
    }

    const settings = await settingsService.setValues(CORE_EMAIL_NAMESPACE, data, { partial: true });
    const mapped = mapEmailSettings(settings);
    hookSystem.emitAsync(CORE_HOOKS.SETTINGS_CHANGED, { type: 'email', settings: mapped });
    return mapped;
  },

  async updateBrandColor(brandColor: string) {
    const { requireTenantId } = await import('../platform/tenant/tenantScope');
    const { prisma } = await import('../config/database');
    const { isAllowedTenantBrandColorId } = await import('../core/branding/tenantBrandPalette');
    if (!isAllowedTenantBrandColorId(brandColor)) {
      const { AppError } = await import('../middleware/errorHandler');
      throw new AppError(400, 'Ungültige Primärfarbe');
    }

    const tenantId = requireTenantId();
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { theme: brandColor },
    });

    emitClubUpdate(await this.getPublic());
    return { theme: brandColor };
  },

  async update(data: {
    clubName?: string;
    description?: string | null;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    website?: string | null;
    logoUrl?: string | null;
    orderFieldFirstNameRequired?: boolean;
    orderFieldLastNameRequired?: boolean;
    orderFieldEmailRequired?: boolean;
    orderFieldPhoneRequired?: boolean;
    cancellationDeadlineHours?: number;
    cancellationDeadlineUnit?: string;
  }) {
    const clubData: Record<string, unknown> = {};
    const orderData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (
        key.startsWith('orderField') ||
        key === 'cancellationDeadlineHours' ||
        key === 'cancellationDeadlineUnit'
      ) {
        orderData[key] = value;
      } else {
        clubData[key] = value;
      }
    }

    if (Object.keys(clubData).length > 0) {
      await settingsService.setValues(CORE_CLUB_NAMESPACE, clubData, { partial: true });
    }
    if (Object.keys(orderData).length > 0) {
      await settingsService.setValues(CORE_ORDER_NAMESPACE, orderData, { partial: true });
    }

    const clubValues = await settingsService.getDecryptedValues(CORE_CLUB_NAMESPACE);
    const orderValues = await settingsService.getDecryptedValues(CORE_ORDER_NAMESPACE);
    const mapped = mapClub({ ...clubValues, ...orderValues });
    emitClubUpdate(mapped);
    hookSystem.emitAsync(CORE_HOOKS.SETTINGS_CHANGED, { type: 'club', settings: mapped });
    return mapped;
  },
};
