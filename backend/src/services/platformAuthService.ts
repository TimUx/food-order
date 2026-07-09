import bcrypt from 'bcryptjs';
import { platformUserRepository } from '../repositories/platformUserRepository';
import { AppError } from '../middleware/errorHandler';
import type { AuthPayload } from '../middleware/platformAuth';
import { parsePlatformPermissions } from '../platform/platformPermissions';
import { platformSessionService } from './platformSessionService';
import { auditService } from '../platform/bootstrap';

export const platformAuthService = {
  async login(email: string, password: string, userAgent?: string) {
    const user = await platformUserRepository.findByEmail(email);
    if (!user || !user.active) {
      throw new AppError(401, 'Ungültige Anmeldedaten');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Ungültige Anmeldedaten');
    }

    const permissions = parsePlatformPermissions(user.permissions);
    const payload: Omit<AuthPayload, 'sessionId'> = {
      userId: user.id,
      email: user.email,
      role: 'PLATFORM_ADMIN',
      scope: 'platform',
      permissions,
    };

    const { accessToken, refreshToken } = await platformSessionService.createSession(
      user.id,
      payload,
      userAgent
    );

    await platformUserRepository.updateLastLogin(user.id);
    await auditService.log({
      action: 'platform.auth.login',
      actorId: user.id,
      details: { email: user.email },
    });

    return {
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: 'PLATFORM_ADMIN' as const,
        permissions,
      },
    };
  },

  async logout(refreshToken: string, actorId?: string) {
    await platformSessionService.revokeSession(refreshToken);
    if (actorId) {
      await auditService.log({ action: 'platform.auth.logout', actorId });
    }
  },

  async refresh(refreshToken: string) {
    const tokens = await platformSessionService.refreshSession(refreshToken);
    return {
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString(),
    };
  },

  async me(userId: string) {
    const user = await platformUserRepository.findById(userId);
    if (!user || !user.active) {
      throw new AppError(401, 'Benutzer nicht gefunden');
    }
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: 'PLATFORM_ADMIN' as const,
      permissions: parsePlatformPermissions(user.permissions),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      mfaEnabled: user.mfaEnabled,
    };
  },
};
