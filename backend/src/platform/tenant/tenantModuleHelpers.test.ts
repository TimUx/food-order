import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tenantCacheKey, isModuleEnabledForCurrentTenant } from './tenantModuleHelpers';

vi.mock('../../repositories/tenantModuleRepository', () => ({
  tenantModuleRepository: {
    findUnique: vi.fn(),
  },
}));

import { tenantModuleRepository } from '../../repositories/tenantModuleRepository';
import { tenantContext } from '../bootstrap';

describe('tenantModuleHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tenantCacheKey', () => {
    it('prefixes namespace with tenant id from context', () => {
      tenantContext.run(
        {
          id: 'tenant-a',
          name: 'A',
          shortName: null,
          slug: 'a',
          subdomain: 'a',
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
          expect(tenantCacheKey('module.payment')).toBe('tenant-a:module.payment');
        }
      );
    });

    it('uses explicit tenant id when provided', () => {
      expect(tenantCacheKey('club', 'tenant-b')).toBe('tenant-b:club');
    });

    it('returns namespace unchanged without tenant context', () => {
      expect(tenantCacheKey('club')).toBe('club');
    });
  });

  describe('isModuleEnabledForCurrentTenant', () => {
    it('returns false without tenant context', async () => {
      expect(await isModuleEnabledForCurrentTenant('payment')).toBe(false);
    });

    it('returns true when module is installed and enabled', async () => {
      vi.mocked(tenantModuleRepository.findUnique).mockResolvedValue({
        tenantId: 't1',
        moduleId: 'payment',
        installed: true,
        enabled: true,
      } as never);

      const result = await tenantContext.runAsync(
        {
          id: 't1',
          name: 'T',
          shortName: null,
          slug: 't',
          subdomain: 't',
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
        async () => isModuleEnabledForCurrentTenant('payment')
      );

      expect(result).toBe(true);
      expect(tenantModuleRepository.findUnique).toHaveBeenCalledWith('payment');
    });

    it('returns false when module is disabled', async () => {
      vi.mocked(tenantModuleRepository.findUnique).mockResolvedValue({
        tenantId: 't1',
        moduleId: 'payment',
        installed: true,
        enabled: false,
      } as never);

      const result = await tenantContext.runAsync(
        {
          id: 't1',
          name: 'T',
          shortName: null,
          slug: 't',
          subdomain: 't',
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
        async () => isModuleEnabledForCurrentTenant('payment')
      );

      expect(result).toBe(false);
    });
  });
});
