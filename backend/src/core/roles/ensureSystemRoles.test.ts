import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RoleName } from '@prisma/client';
import { ensureSystemRole, ensureSystemRoles } from './ensureSystemRoles';

vi.mock('../../config/database', () => ({
  prisma: {
    role: { upsert: vi.fn() },
  },
}));

import { prisma } from '../../config/database';

describe('ensureSystemRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts ADMIN and STAFF roles', async () => {
    vi.mocked(prisma.role.upsert)
      .mockResolvedValueOnce({ id: 'admin-id', name: RoleName.ADMIN, permissions: [] } as never)
      .mockResolvedValueOnce({ id: 'staff-id', name: RoleName.STAFF, permissions: [] } as never);

    const roles = await ensureSystemRoles();

    expect(roles.admin.id).toBe('admin-id');
    expect(roles.staff.id).toBe('staff-id');
    expect(prisma.role.upsert).toHaveBeenCalledTimes(2);
  });

  it('creates missing role on demand', async () => {
    vi.mocked(prisma.role.upsert).mockResolvedValue({
      id: 'admin-id',
      name: RoleName.ADMIN,
      permissions: [],
    } as never);

    const role = await ensureSystemRole(RoleName.ADMIN);

    expect(role.name).toBe(RoleName.ADMIN);
    expect(prisma.role.upsert).toHaveBeenCalledWith({
      where: { name: RoleName.ADMIN },
      update: {},
      create: { name: RoleName.ADMIN, permissions: [] },
    });
  });
});
