import { RoleName } from '@prisma/client';
import { prisma } from '../../config/database';

export async function ensureSystemRole(name: RoleName) {
  return prisma.role.upsert({
    where: { name },
    update: {},
    create: { name, permissions: [] },
  });
}

export async function ensureSystemRoles() {
  const [admin, staff] = await Promise.all([
    ensureSystemRole(RoleName.ADMIN),
    ensureSystemRole(RoleName.STAFF),
  ]);
  return { admin, staff };
}
