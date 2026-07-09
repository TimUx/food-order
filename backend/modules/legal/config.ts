import { z } from 'zod';

export const LEGAL_PAGE_TYPES = ['imprint', 'privacy', 'terms', 'withdrawal'] as const;
export type LegalPageType = (typeof LEGAL_PAGE_TYPES)[number];

export const LEGAL_PAGE_DEFAULTS: Record<LegalPageType, { title: string; slug: string }> = {
  imprint: { title: 'Impressum', slug: 'impressum' },
  privacy: { title: 'Datenschutzerklaerung', slug: 'datenschutz' },
  terms: { title: 'Allgemeine Geschaeftsbedingungen', slug: 'agb' },
  withdrawal: { title: 'Widerrufsbelehrung', slug: 'widerruf' },
};

export const legalConfigSchema = z.object({
  appendClubContactToImprint: z.boolean().default(true),
  showFooterLinks: z.boolean().default(true),
  showNotificationLinks: z.boolean().default(true),
});

export type LegalConfig = z.infer<typeof legalConfigSchema>;

export const defaultLegalConfig: LegalConfig = {
  appendClubContactToImprint: true,
  showFooterLinks: true,
  showNotificationLinks: true,
};

export const LEGAL_PERMISSIONS = {
  VIEW: 'legal.view',
  MANAGE: 'legal.manage',
  PUBLISH: 'legal.publish',
} as const;
