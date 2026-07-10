import { describe, it, expect } from 'vitest';
import { SettingsCache } from './SettingsCache';
import { tenantCacheKey } from '../tenant/tenantModuleHelpers';
import { tenantContext } from '../bootstrap';

describe('SettingsCache tenant isolation', () => {
  it('stores values under tenant-prefixed keys', () => {
    const cache = new SettingsCache(60_000);

    tenantContext.run(
      {
        id: 'tenant-1',
        name: 'One',
        shortName: null,
        slug: 'one',
        subdomain: 'one',
        status: 'ACTIVE',
        locale: 'de-DE',
        timezone: 'Europe/Berlin',
        currency: 'EUR',
        theme: 'default',
        logoUrl: null,
        contactName: null,
        email: null,
        phone: null,
        description: null,
        address: null,
        website: null,
        settings: {
          orderFieldFirstNameRequired: false,
          orderFieldLastNameRequired: true,
          orderFieldEmailRequired: false,
          orderFieldPhoneRequired: false,
          cancellationDeadlineHours: 24,
          dataRetentionDays: 365,
        },
      },
      () => {
        cache.set(tenantCacheKey('club'), { clubName: 'Tenant One' });
      }
    );

    tenantContext.run(
      {
        id: 'tenant-2',
        name: 'Two',
        shortName: null,
        slug: 'two',
        subdomain: 'two',
        status: 'ACTIVE',
        locale: 'de-DE',
        timezone: 'Europe/Berlin',
        currency: 'EUR',
        theme: 'default',
        logoUrl: null,
        contactName: null,
        email: null,
        phone: null,
        description: null,
        address: null,
        website: null,
        settings: {
          orderFieldFirstNameRequired: false,
          orderFieldLastNameRequired: true,
          orderFieldEmailRequired: false,
          orderFieldPhoneRequired: false,
          cancellationDeadlineHours: 24,
          dataRetentionDays: 365,
        },
      },
      () => {
        expect(cache.get(tenantCacheKey('club'))).toBeUndefined();
        cache.set(tenantCacheKey('club'), { clubName: 'Tenant Two' });
        expect(cache.get(tenantCacheKey('club'))).toEqual({ clubName: 'Tenant Two' });
      }
    );

    tenantContext.run(
      {
        id: 'tenant-1',
        name: 'One',
        shortName: null,
        slug: 'one',
        subdomain: 'one',
        status: 'ACTIVE',
        locale: 'de-DE',
        timezone: 'Europe/Berlin',
        currency: 'EUR',
        theme: 'default',
        logoUrl: null,
        contactName: null,
        email: null,
        phone: null,
        description: null,
        address: null,
        website: null,
        settings: {
          orderFieldFirstNameRequired: false,
          orderFieldLastNameRequired: true,
          orderFieldEmailRequired: false,
          orderFieldPhoneRequired: false,
          cancellationDeadlineHours: 24,
          dataRetentionDays: 365,
        },
      },
      () => {
        expect(cache.get(tenantCacheKey('club'))).toEqual({ clubName: 'Tenant One' });
      }
    );
  });
});
