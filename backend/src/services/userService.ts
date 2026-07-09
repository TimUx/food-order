import bcrypt from 'bcryptjs';
import { RoleName } from '@prisma/client';
import { userRepository } from '../repositories';
import { AppError } from '../middleware/errorHandler';
import { requireTenantId, tenantWhere } from '../platform/tenant/tenantScope';
import { prisma } from '../config/database';

function mapUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
  role: { name: RoleName };
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    active: user.active,
    role: user.role.name,
    createdAt: user.createdAt.toISOString(),
  };
}

export const userService = {
  async list() {
    const users = await userRepository.findForTenant();
    return users.map(mapUser);
  },

  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: RoleName;
  }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError(409, 'E-Mail bereits registriert');
    }

    const role = await prisma.role.findUnique({ where: { name: data.role } });
    if (!role) throw new AppError(500, 'Rolle nicht gefunden');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await userRepository.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      roleId: role.id,
    });
    return mapUser(user);
  },

  async update(
    id: string,
    data: {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      role?: RoleName;
      active?: boolean;
    },
    currentUserId: string
  ) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError(404, 'Benutzer nicht gefunden');

    if (data.email && data.email !== user.email) {
      const existing = await userRepository.findByEmail(data.email);
      if (existing) throw new AppError(409, 'E-Mail bereits registriert');
    }

    if (data.active === false && user.id === currentUserId) {
      throw new AppError(400, 'Sie können sich nicht selbst deaktivieren');
    }

    if (data.role && data.role !== 'ADMIN' && user.role.name === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: tenantWhere({ active: true, role: { name: 'ADMIN' } }),
      });
      if (adminCount <= 1) {
        throw new AppError(400, 'Der letzte Administrator kann nicht herabgestuft werden');
      }
    }

    const updateData: Parameters<typeof userRepository.update>[1] = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 12);
    if (data.role) {
      const role = await prisma.role.findUnique({ where: { name: data.role } });
      if (!role) throw new AppError(500, 'Rolle nicht gefunden');
      updateData.role = { connect: { id: role.id } };
    }

    const updated = await userRepository.update(id, updateData);

    if (data.active === false) {
      const { authService } = await import('./authService');
      await authService.revokeAllForUser(id);
    }

    return mapUser(updated);
  },
};
