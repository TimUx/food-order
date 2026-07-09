export interface TenantPublicData {
  name: string;
  shortName?: string | null;
  slug: string;
  logoUrl?: string | null;
  description?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  theme: string;
  locale: string;
  timezone: string;
  currency: string;
}

export interface PlatformPublicData {
  name: string;
  version: string;
  baseDomain: string;
  wwwDomain?: string;
  apiDomain?: string | null;
  wildcardDomain?: string;
  tenantDomainPattern?: string;
  domains?: import('./routing').PlatformDomainsConfig;
  maintenanceMode: boolean;
  maintenanceMessage?: string | null;
  primaryColor?: string;
  defaultLocale?: string;
  registrationEnabled?: boolean;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactAddress?: string | null;
  website?: string | null;
  footerText?: string | null;
  githubUrl?: string | null;
}

export interface PlatformLegalLink {
  slug: string;
  title: string;
  pageType: string;
}

export interface PlatformLegalPage {
  slug: string;
  title: string;
  pageType: string;
  contentHtml: string;
}

export interface TenantApplicationInput {
  organization: string;
  organizationType: string;
  contactName: string;
  street: string;
  postalCode: string;
  city: string;
  country?: string;
  email: string;
  phone?: string;
  website?: string;
  memberCount?: number;
  eventsPerYear?: number;
  reason: string;
  desiredFeatures: string;
  freeTierJustification: string;
  plannedUsage: string;
  notes?: string;
  requestedSubdomain: string;
  privacyAccepted: true;
  termsAccepted: true;
}

export const DEFAULT_TENANT: TenantPublicData = {
  name: 'FestManager',
  slug: 'default',
  theme: 'default',
  locale: 'de-DE',
  timezone: 'Europe/Berlin',
  currency: 'EUR',
};

export const DEFAULT_PLATFORM: PlatformPublicData = {
  name: 'FestManager',
  version: '2.0.0',
  baseDomain: 'localhost',
  maintenanceMode: false,
  primaryColor: '#1565c0',
  defaultLocale: 'de-DE',
  registrationEnabled: false,
  githubUrl: 'https://github.com/TimUx/FestManager',
};
