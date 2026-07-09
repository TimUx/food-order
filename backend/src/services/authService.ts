import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories';
import { AppError } from '../middleware/errorHandler';
import { AuthPayload } from '../middleware/auth';
import { parsePermissionKeys } from '../platform/permissions';
import { hookSystem } from '../platform/bootstrap';
import { CORE_HOOKS } from '../platform/types';
import { sessionService } from './sessionService';

export const authService = {
  async login(email: string, password: string, userAgent?: string) {
    const user = await userRepository.findByEmail(email);
    if (!user || !user.active) {
      throw new AppError(401, 'Ungültige Anmeldedaten');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Ungültige Anmeldedaten');
    }

    const payload: Omit<AuthPayload, 'sessionId'> = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
      scope: 'tenant',
    };

    const { accessToken, refreshToken } = await sessionService.createSession(
      user.id,
      payload,
      userAgent
    );

    hookSystem.emitAsync(CORE_HOOKS.USER_LOGIN, {
      userId: user.id,
      email: user.email,
      role: user.role.name,
    });

    return {
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
        permissions: parsePermissionKeys(user.role.permissions),
      },
    };
  },

  async logout(refreshToken: string) {
    await sessionService.revokeSession(refreshToken);
  },

  async refresh(refreshToken: string) {
    const tokens = await sessionService.refreshSession(refreshToken);
    return {
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString(),
    };
  },

  async revokeAllForUser(userId: string) {
    await sessionService.revokeAllUserSessions(userId);
  },

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleName: 'ADMIN' | 'STAFF';
  }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError(409, 'E-Mail bereits registriert');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const role = await import('../config/database').then(({ prisma }) =>
      prisma.role.findUnique({ where: { name: data.roleName } })
    );
    if (!role) throw new AppError(500, 'Rolle nicht gefunden');

    return userRepository.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      roleId: role.id,
    });
  },
};
