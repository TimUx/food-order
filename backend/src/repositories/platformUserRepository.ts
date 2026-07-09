import { prisma } from '../config/database';
import type { Prisma } from '@prisma/client';

export const platformUserRepository = {
  findByEmail(email: string) {
    return prisma.platformUser.findUnique({ where: { email } });
  },

  findById(id: string) {
    return prisma.platformUser.findUnique({ where: { id } });
  },

  findAll() {
    return prisma.platformUser.findMany({ orderBy: { createdAt: 'desc' } });
  },

  create(data: Prisma.PlatformUserUncheckedCreateInput) {
    return prisma.platformUser.create({ data });
  },

  update(id: string, data: Prisma.PlatformUserUpdateInput) {
    return prisma.platformUser.update({ where: { id }, data });
  },

  async updateLastLogin(id: string): Promise<void> {
    await prisma.platformUser.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  },

  async countActive(): Promise<number> {
    return prisma.platformUser.count({ where: { active: true } });
  },
};
