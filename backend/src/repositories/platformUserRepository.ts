import { prisma } from '../config/database';
import type { Prisma } from '@prisma/client';
import { parseLoginIdentifier } from '../services/loginIdentifier';

export const platformUserRepository = {
  findByEmail(email: string) {
    return prisma.platformUser.findUnique({ where: { email: email.toLowerCase().trim() } });
  },

  findByUsername(username: string) {
    return prisma.platformUser.findUnique({ where: { username: username.toLowerCase().trim() } });
  },

  findByLoginIdentifier(identifier: string) {
    const parsed = parseLoginIdentifier(identifier);
    if (parsed.type === 'email') {
      return platformUserRepository.findByEmail(parsed.value);
    }
    return platformUserRepository.findByUsername(parsed.value);
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
