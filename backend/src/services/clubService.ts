import { clubRepository, DEFAULT_CLUB } from '../repositories/clubRepository';
import { emitClubUpdate } from '../socket';

type ClubSettingsRow = Awaited<ReturnType<typeof clubRepository.get>>;

function mapClub(settings: ClubSettingsRow) {
  return {
    clubName: settings.clubName || DEFAULT_CLUB.clubName,
    description: settings.description || DEFAULT_CLUB.description,
    contactName: settings.contactName || DEFAULT_CLUB.contactName,
    email: settings.email || DEFAULT_CLUB.email,
    phone: settings.phone || DEFAULT_CLUB.phone,
    address: settings.address || DEFAULT_CLUB.address,
    website: settings.website || DEFAULT_CLUB.website,
    logoUrl: settings.logoUrl,
    orderFieldFirstNameRequired: settings.orderFieldFirstNameRequired,
    orderFieldLastNameRequired: settings.orderFieldLastNameRequired,
    orderFieldEmailRequired: settings.orderFieldEmailRequired,
    orderFieldPhoneRequired: settings.orderFieldPhoneRequired,
    cancellationDeadlineHours: settings.cancellationDeadlineHours,
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

export function mapEmailSettings(settings: ClubSettingsRow) {
  return {
    smtpHost: settings.smtpHost || '',
    smtpPort: settings.smtpPort ?? 587,
    smtpUser: settings.smtpUser || '',
    smtpFrom: settings.smtpFrom || '',
    smtpPassConfigured: Boolean(settings.smtpPass),
    smtpEnabled: Boolean(settings.smtpHost?.trim()),
    emailCustomText: settings.emailCustomText || '',
  };
}

export const clubService = {
  async getSettings() {
    return clubRepository.get();
  },

  async getPublic() {
    const settings = await clubRepository.get();
    return mapClub(settings);
  },

  async getOrderSettings() {
    const settings = await clubRepository.get();
    return {
      fields: mapOrderFieldConfig(settings),
      cancellationDeadlineHours: settings.cancellationDeadlineHours,
    };
  },

  async getEmailSettings() {
    const settings = await clubRepository.get();
    return mapEmailSettings(settings);
  },

  async updateEmailSettings(data: {
    smtpHost?: string | null;
    smtpPort?: number;
    smtpUser?: string | null;
    smtpPass?: string | null;
    smtpFrom?: string | null;
    emailCustomText?: string | null;
  }) {
    const update: Parameters<typeof clubRepository.update>[0] = {};

    if (data.smtpHost !== undefined) update.smtpHost = data.smtpHost?.trim() || null;
    if (data.smtpPort !== undefined) update.smtpPort = data.smtpPort;
    if (data.smtpUser !== undefined) update.smtpUser = data.smtpUser?.trim() || null;
    if (data.smtpFrom !== undefined) update.smtpFrom = data.smtpFrom?.trim() || null;
    if (data.emailCustomText !== undefined) update.emailCustomText = data.emailCustomText?.trim() || null;
    if (data.smtpPass !== undefined && data.smtpPass !== '') {
      update.smtpPass = data.smtpPass;
    }

    const settings = await clubRepository.update(update);
    return mapEmailSettings(settings);
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
  }) {
    const settings = await clubRepository.update(data);
    const mapped = mapClub(settings);
    emitClubUpdate(mapped);
    return mapped;
  },
};
