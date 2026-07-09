export type TenantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export interface TenantRecord {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  subdomain: string;
  status: TenantStatus;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
  locale: string;
  timezone: string;
  currency: string;
  theme: string;
  description: string | null;
  address: string | null;
  website: string | null;
  activatedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettingsRecord {
  orderFieldFirstNameRequired: boolean;
  orderFieldLastNameRequired: boolean;
  orderFieldEmailRequired: boolean;
  orderFieldPhoneRequired: boolean;
  cancellationDeadlineHours: number;
  dataRetentionDays: number;
}

export interface TenantContextData {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  subdomain: string;
  status: TenantStatus;
  locale: string;
  timezone: string;
  currency: string;
  theme: string;
  logoUrl: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  description: string | null;
  address: string | null;
  website: string | null;
  settings: TenantSettingsRecord;
}

export interface PlatformContextData {
  platformName: string;
  platformVersion: string;
  baseDomain: string;
  wwwDomain: string;
  apiDomain: string | null;
  wildcardDomain: string;
  cookieDomain: string | null;
  sessionDomain: string | null;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  allowedDomains: string[];
  pathPrefixRoutingEnabled: boolean;
  defaultLocale: string;
  defaultTimezone: string;
  defaultTheme: string;
  defaultCurrency: string;
  registrationEnabled: boolean;
  updateChannel: 'stable' | 'beta';
  reservedSubdomains: string[];
}

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

export interface CreateTenantInput {
  name: string;
  shortName?: string;
  slug: string;
  subdomain: string;
  status?: TenantStatus;
  contactName?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  locale?: string;
  timezone?: string;
  currency?: string;
  theme?: string;
  description?: string;
  address?: string;
  website?: string;
}

export interface UpdateTenantInput {
  name?: string;
  shortName?: string | null;
  slug?: string;
  subdomain?: string;
  status?: TenantStatus;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  locale?: string;
  timezone?: string;
  currency?: string;
  theme?: string;
  description?: string | null;
  address?: string | null;
  website?: string | null;
  activatedAt?: Date | null;
  archivedAt?: Date | null;
}

export type ResolveType = 'tenant' | 'platform' | 'unknown';

export interface ResolveResult {
  type: ResolveType;
  tenant?: TenantContextData;
  matchedBy?: 'subdomain' | 'path_prefix' | 'default_fallback' | 'custom_domain';
  pathPrefix?: string;
}

export const DEFAULT_TENANT_SETTINGS: TenantSettingsRecord = {
  orderFieldFirstNameRequired: true,
  orderFieldLastNameRequired: true,
  orderFieldEmailRequired: false,
  orderFieldPhoneRequired: false,
  cancellationDeadlineHours: 24,
  dataRetentionDays: 365,
};

export const RESERVED_SUBDOMAINS = [
  'www',
  'api',
  'admin',
  'platform',
  'status',
  'mail',
  'cdn',
  'static',
] as const;

export const DEFAULT_PLATFORM_CONTEXT: PlatformContextData = {
  platformName: 'FestManager',
  platformVersion: '2.0.0',
  baseDomain: 'localhost',
  wwwDomain: 'localhost',
  apiDomain: null,
  wildcardDomain: '*.localhost',
  cookieDomain: null,
  sessionDomain: null,
  maintenanceMode: false,
  allowedDomains: ['localhost'],
  pathPrefixRoutingEnabled: false,
  defaultLocale: 'de-DE',
  defaultTimezone: 'Europe/Berlin',
  defaultTheme: 'default',
  defaultCurrency: 'EUR',
  registrationEnabled: false,
  updateChannel: 'stable',
  reservedSubdomains: [...RESERVED_SUBDOMAINS],
};
