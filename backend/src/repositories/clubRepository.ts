import { prisma } from '../config/database';
import { requireTenantId } from '../platform/tenant/tenantScope';

export const DEFAULT_CLUB = {
  clubName: 'FestManager',
  description: 'Essensbestellungen für unsere Veranstaltungen',
  contactName: 'Verwaltung',
  email: 'kontakt@verein.local',
  phone: '+49 123 456789',
  address: 'Musterstraße 1, 12345 Musterstadt',
  website: 'https://www.verein.local',
};

export const clubRepository = {
  get: async () => {
    const tenantId = requireTenantId();
    let settings = await prisma.clubSettings.findFirst({ where: { tenantId } });
    if (!settings) {
      const legacy = await prisma.clubSettings.findUnique({ where: { id: 'default' } });
      if (legacy) return legacy;
      settings = await prisma.clubSettings.create({
        data: { id: 'default', tenantId, ...DEFAULT_CLUB },
      });
    }
    return settings;
  },

  update: (data: {
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
    smtpHost?: string | null;
    smtpPort?: number;
    smtpUser?: string | null;
    smtpPass?: string | null;
    smtpFrom?: string | null;
    emailCustomText?: string | null;
  }) => {
    const tenantId = requireTenantId();
    return prisma.clubSettings.upsert({
      where: { tenantId },
      create: { id: 'default', tenantId, clubName: data.clubName || DEFAULT_CLUB.clubName, ...data },
      update: data,
    });
  },
};
