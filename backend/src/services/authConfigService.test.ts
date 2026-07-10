import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/database', () => ({
  prisma: {
    platformSettings: { findMany: vi.fn(), upsert: vi.fn() },
  },
}));

import { prisma } from '../config/database';
import { authConfigService } from './authConfigService';

describe('authConfigService', () => {
  beforeEach(() => {
    vi.mocked(prisma.platformSettings.findMany).mockReset();
  });

  it('returns default mode when not configured', async () => {
    vi.mocked(prisma.platformSettings.findMany).mockResolvedValue([]);
    const config = await authConfigService.getConfig();
    expect(config.mode).toBe('password_or_magic');
    expect(config.passwordEnabled).toBe(true);
    expect(config.magicLinkEnabled).toBe(true);
  });

  it('derives passwordless_only capabilities', async () => {
    vi.mocked(prisma.platformSettings.findMany).mockResolvedValue([
      { key: 'platform.auth.mode', value: 'passwordless_only', encrypted: false, updatedAt: new Date() },
    ] as never);
    const config = await authConfigService.getConfig();
    expect(config.passwordEnabled).toBe(false);
    expect(config.magicLinkEnabled).toBe(true);
  });

  it('derives password_only capabilities', async () => {
    vi.mocked(prisma.platformSettings.findMany).mockResolvedValue([
      { key: 'platform.auth.mode', value: 'password_only', encrypted: false, updatedAt: new Date() },
    ] as never);
    const config = await authConfigService.getConfig();
    expect(config.passwordEnabled).toBe(true);
    expect(config.magicLinkEnabled).toBe(false);
  });
});
