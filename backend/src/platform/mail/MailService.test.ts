import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/database', () => ({
  prisma: {
    platformSettings: { findMany: vi.fn(), upsert: vi.fn() },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

vi.mock('../settings/SettingsEncryption', () => ({
  encryptValue: (v: string) => `enc:${v}`,
  decryptValue: (v: string) => v.replace('enc:', ''),
  isEncryptedValue: (v: string) => typeof v === 'string' && v.startsWith('enc:'),
}));

import { prisma } from '../../config/database';
import { mailService } from './MailService';

describe('MailService', () => {
  beforeEach(() => {
    vi.mocked(prisma.platformSettings.findMany).mockReset();
  });

  it('returns null when SMTP is disabled', async () => {
    vi.mocked(prisma.platformSettings.findMany).mockResolvedValue([
      { key: 'platform.smtp.enabled', value: false, encrypted: false, updatedAt: new Date() },
    ] as never);
    expect(await mailService.loadConfig()).toBeNull();
  });

  it('loads SMTP config when enabled', async () => {
    vi.mocked(prisma.platformSettings.findMany).mockResolvedValue([
      { key: 'platform.smtp.enabled', value: true, encrypted: false, updatedAt: new Date() },
      { key: 'platform.smtp.host', value: 'smtp.test.local', encrypted: false, updatedAt: new Date() },
      { key: 'platform.smtp.port', value: 587, encrypted: false, updatedAt: new Date() },
      { key: 'platform.smtp.from', value: 'noreply@test.local', encrypted: false, updatedAt: new Date() },
    ] as never);

    const config = await mailService.loadConfig();
    expect(config?.host).toBe('smtp.test.local');
    expect(config?.port).toBe(587);
  });

  it('masks password in admin config', async () => {
    vi.mocked(prisma.platformSettings.findMany).mockResolvedValue([
      { key: 'platform.smtp.pass', value: 'enc:secret', encrypted: true, updatedAt: new Date() },
      { key: 'platform.smtp.host', value: 'smtp.test.local', encrypted: false, updatedAt: new Date() },
    ] as never);

    const config = await mailService.getConfigForAdmin();
    expect(config.passConfigured).toBe(true);
    expect(config.pass).toBeUndefined();
  });
});
