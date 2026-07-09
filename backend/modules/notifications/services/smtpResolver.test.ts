import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defaultNotificationConfig } from '../config';

vi.mock('../../../src/config/database', () => ({
  prisma: {
    platformSettings: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../../src/config/database';
import { loadPlatformSmtp, resolveSmtpConfig } from './smtpResolver';

describe('smtpResolver', () => {
  beforeEach(() => {
    vi.mocked(prisma.platformSettings.findMany).mockReset();
  });

  it('returns null when platform SMTP is disabled', async () => {
    vi.mocked(prisma.platformSettings.findMany).mockResolvedValue([
      { key: 'platform.smtp.enabled', value: false, encrypted: false, updatedAt: new Date() },
    ] as never);
    expect(await loadPlatformSmtp()).toBeNull();
  });

  it('loads platform SMTP when enabled', async () => {
    vi.mocked(prisma.platformSettings.findMany).mockResolvedValue([
      { key: 'platform.smtp.enabled', value: true, encrypted: false, updatedAt: new Date() },
      { key: 'platform.smtp.host', value: 'smtp.platform.test', encrypted: false, updatedAt: new Date() },
      { key: 'platform.smtp.port', value: 587, encrypted: false, updatedAt: new Date() },
      { key: 'platform.smtp.from', value: 'noreply@platform.test', encrypted: false, updatedAt: new Date() },
      { key: 'platform.smtp.senderName', value: 'Platform', encrypted: false, updatedAt: new Date() },
    ] as never);

    const smtp = await loadPlatformSmtp();
    expect(smtp?.host).toBe('smtp.platform.test');
    expect(smtp?.source).toBe('platform');
  });

  it('prefers tenant SMTP when enabled with host', async () => {
    const tenantConfig = {
      ...defaultNotificationConfig,
      smtp: {
        enabled: true,
        host: 'smtp.tenant.test',
        port: 587,
        from: 'tenant@example.de',
        source: 'tenant' as const,
      },
    };

    const resolved = await resolveSmtpConfig(tenantConfig);
    expect(resolved.host).toBe('smtp.tenant.test');
    expect(resolved.source).toBe('tenant');
    expect(prisma.platformSettings.findMany).not.toHaveBeenCalled();
  });

  it('falls back to platform SMTP when tenant SMTP is disabled', async () => {
    vi.mocked(prisma.platformSettings.findMany).mockResolvedValue([
      { key: 'platform.smtp.enabled', value: true, encrypted: false, updatedAt: new Date() },
      { key: 'platform.smtp.host', value: 'smtp.platform.test', encrypted: false, updatedAt: new Date() },
      { key: 'platform.smtp.port', value: 587, encrypted: false, updatedAt: new Date() },
      { key: 'platform.smtp.from', value: 'noreply@platform.test', encrypted: false, updatedAt: new Date() },
    ] as never);

    const tenantConfig = {
      ...defaultNotificationConfig,
      smtp: {
        enabled: false,
        port: 587,
        from: 'custom@tenant.de',
        source: 'tenant' as const,
      },
    };

    const resolved = await resolveSmtpConfig(tenantConfig);
    expect(resolved.host).toBe('smtp.platform.test');
    expect(resolved.source).toBe('platform');
    expect(resolved.from).toBe('custom@tenant.de');
  });

  it('uses platform SMTP when tenant selects platform source', async () => {
    vi.mocked(prisma.platformSettings.findMany).mockResolvedValue([
      { key: 'platform.smtp.enabled', value: true, encrypted: false, updatedAt: new Date() },
      { key: 'platform.smtp.host', value: 'smtp.platform.test', encrypted: false, updatedAt: new Date() },
      { key: 'platform.smtp.port', value: 587, encrypted: false, updatedAt: new Date() },
      { key: 'platform.smtp.from', value: 'noreply@platform.test', encrypted: false, updatedAt: new Date() },
    ] as never);

    const tenantConfig = {
      ...defaultNotificationConfig,
      smtp: {
        enabled: true,
        host: 'smtp.tenant.test',
        port: 587,
        source: 'platform' as const,
      },
    };

    const resolved = await resolveSmtpConfig(tenantConfig);
    expect(resolved.host).toBe('smtp.platform.test');
    expect(resolved.source).toBe('platform');
  });
});
