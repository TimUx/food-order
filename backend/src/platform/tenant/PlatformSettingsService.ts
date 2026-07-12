import { prisma } from '../../config/database';
import type { PlatformContextData } from './types';
import { DEFAULT_PLATFORM_CONTEXT } from './types';
import { PlatformConfigMissingError } from './errors';

const PLATFORM_SETTING_KEYS = {
  NAME: 'platform.name',
  BASE_DOMAIN: 'platform.baseDomain',
  WILDCARD_DOMAIN: 'platform.wildcardDomain',
  ALLOWED_DOMAINS: 'platform.allowedDomains',
  MAINTENANCE_ENABLED: 'platform.maintenance.enabled',
  MAINTENANCE_MESSAGE: 'platform.maintenance.message',
  PATH_PREFIX: 'platform.routing.pathPrefixEnabled',
  DEFAULT_LOCALE: 'platform.defaults.locale',
  DEFAULT_TIMEZONE: 'platform.defaults.timezone',
  DEFAULT_THEME: 'platform.defaults.theme',
  DEFAULT_CURRENCY: 'platform.defaults.currency',
  REGISTRATION_ENABLED: 'platform.registration.enabled',
  UPDATE_CHANNEL: 'platform.update.channel',
  RESERVED_SUBDOMAINS: 'platform.reservedSubdomains',
} as const;

export class PlatformSettingsService {
  async loadContextData(platformVersion: string): Promise<PlatformContextData> {
    const rows = await (prisma as unknown as {
      platformSettings: {
        findMany: () => Promise<Array<{ key: string; value: unknown }>>;
        upsert: (args: unknown) => Promise<unknown>;
      };
    }).platformSettings.findMany();
    if (rows.length === 0) {
      await this.seedDefaults(platformVersion);
      return { ...DEFAULT_PLATFORM_CONTEXT, platformVersion };
    }

    const map = new Map<string, unknown>(rows.map((row) => [row.key, row.value]));
    const baseDomain = this.readString(map, PLATFORM_SETTING_KEYS.BASE_DOMAIN, DEFAULT_PLATFORM_CONTEXT.baseDomain);
    if (!baseDomain) {
      throw new PlatformConfigMissingError();
    }

    return {
      platformName: this.readString(map, PLATFORM_SETTING_KEYS.NAME, DEFAULT_PLATFORM_CONTEXT.platformName),
      platformVersion,
      baseDomain,
      wwwSubdomain: DEFAULT_PLATFORM_CONTEXT.wwwSubdomain,
      wwwDomain: DEFAULT_PLATFORM_CONTEXT.wwwDomain,
      appSubdomain: DEFAULT_PLATFORM_CONTEXT.appSubdomain,
      appDomain: DEFAULT_PLATFORM_CONTEXT.appDomain,
      apiSubdomain: DEFAULT_PLATFORM_CONTEXT.apiSubdomain,
      apiDomain: DEFAULT_PLATFORM_CONTEXT.apiDomain,
      docsSubdomain: DEFAULT_PLATFORM_CONTEXT.docsSubdomain,
      docsDomain: DEFAULT_PLATFORM_CONTEXT.docsDomain,
      statusSubdomain: DEFAULT_PLATFORM_CONTEXT.statusSubdomain,
      statusDomain: DEFAULT_PLATFORM_CONTEXT.statusDomain,
      wildcardDomain: this.readString(map, PLATFORM_SETTING_KEYS.WILDCARD_DOMAIN, `*.${baseDomain}`),
      cookieDomain: DEFAULT_PLATFORM_CONTEXT.cookieDomain,
      sessionDomain: DEFAULT_PLATFORM_CONTEXT.sessionDomain,
      maintenanceMode: this.readBoolean(map, PLATFORM_SETTING_KEYS.MAINTENANCE_ENABLED, false),
      maintenanceMessage: this.readString(map, PLATFORM_SETTING_KEYS.MAINTENANCE_MESSAGE, undefined),
      allowedDomains: this.readStringArray(map, PLATFORM_SETTING_KEYS.ALLOWED_DOMAINS, [
        baseDomain,
        'localhost',
      ]),
      pathPrefixRoutingEnabled: this.readBoolean(map, PLATFORM_SETTING_KEYS.PATH_PREFIX, true),
      defaultLocale: this.readString(map, PLATFORM_SETTING_KEYS.DEFAULT_LOCALE, 'de-DE'),
      defaultTimezone: this.readString(map, PLATFORM_SETTING_KEYS.DEFAULT_TIMEZONE, 'Europe/Berlin'),
      defaultTheme: this.readString(map, PLATFORM_SETTING_KEYS.DEFAULT_THEME, 'default'),
      defaultCurrency: this.readString(map, PLATFORM_SETTING_KEYS.DEFAULT_CURRENCY, 'EUR'),
      registrationEnabled: this.readBoolean(map, PLATFORM_SETTING_KEYS.REGISTRATION_ENABLED, false),
      updateChannel: this.readChannel(map, PLATFORM_SETTING_KEYS.UPDATE_CHANNEL),
      reservedSubdomains: this.readStringArray(
        map,
        PLATFORM_SETTING_KEYS.RESERVED_SUBDOMAINS,
        DEFAULT_PLATFORM_CONTEXT.reservedSubdomains
      ),
    };
  }

  async seedDefaults(platformVersion: string): Promise<void> {
    const defaults: Array<{ key: string; value: unknown }> = [
      { key: PLATFORM_SETTING_KEYS.NAME, value: DEFAULT_PLATFORM_CONTEXT.platformName },
      { key: PLATFORM_SETTING_KEYS.BASE_DOMAIN, value: DEFAULT_PLATFORM_CONTEXT.baseDomain },
      { key: PLATFORM_SETTING_KEYS.WILDCARD_DOMAIN, value: DEFAULT_PLATFORM_CONTEXT.wildcardDomain },
      { key: PLATFORM_SETTING_KEYS.ALLOWED_DOMAINS, value: DEFAULT_PLATFORM_CONTEXT.allowedDomains },
      { key: PLATFORM_SETTING_KEYS.MAINTENANCE_ENABLED, value: false },
      { key: PLATFORM_SETTING_KEYS.PATH_PREFIX, value: true },
      { key: PLATFORM_SETTING_KEYS.DEFAULT_LOCALE, value: DEFAULT_PLATFORM_CONTEXT.defaultLocale },
      { key: PLATFORM_SETTING_KEYS.DEFAULT_TIMEZONE, value: DEFAULT_PLATFORM_CONTEXT.defaultTimezone },
      { key: PLATFORM_SETTING_KEYS.DEFAULT_THEME, value: DEFAULT_PLATFORM_CONTEXT.defaultTheme },
      { key: PLATFORM_SETTING_KEYS.DEFAULT_CURRENCY, value: DEFAULT_PLATFORM_CONTEXT.defaultCurrency },
      { key: PLATFORM_SETTING_KEYS.REGISTRATION_ENABLED, value: false },
      { key: PLATFORM_SETTING_KEYS.UPDATE_CHANNEL, value: 'stable' },
      { key: PLATFORM_SETTING_KEYS.RESERVED_SUBDOMAINS, value: DEFAULT_PLATFORM_CONTEXT.reservedSubdomains },
      { key: 'platform.version', value: platformVersion },
    ];

    const platformSettings = (prisma as unknown as {
      platformSettings: { upsert: (args: unknown) => Promise<unknown> };
    }).platformSettings;

    for (const item of defaults) {
      await platformSettings.upsert({
        where: { key: item.key },
        update: { value: item.value as object },
        create: { key: item.key, value: item.value as object },
      });
    }
  }

  private readString(
    map: Map<string, unknown>,
    key: string,
    fallback?: string
  ): string {
    const value = map.get(key);
    if (typeof value === 'string' && value.trim()) return value;
    if (fallback !== undefined) return fallback;
    return '';
  }

  private readBoolean(map: Map<string, unknown>, key: string, fallback: boolean): boolean {
    const value = map.get(key);
    return typeof value === 'boolean' ? value : fallback;
  }

  private readStringArray(map: Map<string, unknown>, key: string, fallback: string[]): string[] {
    const value = map.get(key);
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      return value as string[];
    }
    return fallback;
  }

  private readChannel(
    map: Map<string, unknown>,
    key: string
  ): 'stable' | 'beta' {
    const value = map.get(key);
    return value === 'beta' ? 'beta' : 'stable';
  }

  async getAllSettings(): Promise<Record<string, unknown>> {
    const rows = await prisma.platformSettings.findMany({ orderBy: { key: 'asc' } });
    const result: Record<string, unknown> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  async getNamespace(prefix: string): Promise<Record<string, unknown>> {
    const all = await this.getAllSettings();
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith(prefix)) {
        result[key.slice(prefix.length + 1) || key] = value;
      }
    }
    return result;
  }

  async updateSettings(
    updates: Record<string, unknown>,
    updatedBy?: string
  ): Promise<Record<string, unknown>> {
    for (const [key, value] of Object.entries(updates)) {
      await prisma.platformSettings.upsert({
        where: { key },
        update: { value: value as object, updatedBy: updatedBy ?? null },
        create: { key, value: value as object, updatedBy: updatedBy ?? null },
      });
    }
    return this.getAllSettings();
  }
}
