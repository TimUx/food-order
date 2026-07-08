import { prisma } from '../config/database';

export const DEFAULT_CLUB = {
  clubName: 'Vereinsbestellung',
  description: 'Essensbestellungen für unsere Veranstaltungen',
  contactName: 'Vereinsverwaltung',
  email: 'kontakt@verein.local',
  phone: '+49 123 456789',
  address: 'Musterstraße 1, 12345 Musterstadt',
  website: 'https://www.verein.local',
};

export const clubRepository = {
  get: async () => {
    let settings = await prisma.clubSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.clubSettings.create({
        data: { id: 'default', ...DEFAULT_CLUB },
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
  }) =>
    prisma.clubSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', clubName: data.clubName || DEFAULT_CLUB.clubName, ...data },
      update: data,
    }),
};
