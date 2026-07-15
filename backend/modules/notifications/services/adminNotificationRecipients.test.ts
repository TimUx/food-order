import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findAdminNotificationSubscribers } = vi.hoisted(() => ({
  findAdminNotificationSubscribers: vi.fn(),
}));

vi.mock('../../../src/repositories', () => ({
  userRepository: {
    findAdminNotificationSubscribers,
  },
}));

import { getTenantAdminNotificationEmails } from './adminNotificationRecipients';

describe('getTenantAdminNotificationEmails', () => {
  beforeEach(() => {
    findAdminNotificationSubscribers.mockReset();
  });

  it('returns unique normalized admin emails', async () => {
    findAdminNotificationSubscribers.mockResolvedValue([
      { email: ' Admin@Example.de ' },
      { email: 'admin@example.de' },
      { email: 'other@example.de' },
      { email: null },
    ]);

    await expect(getTenantAdminNotificationEmails()).resolves.toEqual([
      'admin@example.de',
      'other@example.de',
    ]);
  });

  it('returns empty list when no subscribers', async () => {
    findAdminNotificationSubscribers.mockResolvedValue([]);
    await expect(getTenantAdminNotificationEmails()).resolves.toEqual([]);
  });
});
