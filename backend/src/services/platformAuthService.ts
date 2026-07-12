import { AuthTokenType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { platformUserRepository } from '../repositories/platformUserRepository';
import { AppError } from '../middleware/errorHandler';
import type { AuthPayload } from '../middleware/platformAuth';
import { parsePlatformPermissions } from '../platform/platformPermissions';
import { platformSessionService } from './platformSessionService';
import { auditService } from '../platform/bootstrap';
import { platformAuthLoginTokenService } from './platformAuthLoginTokenService';
import { mailService } from '../platform/mail/MailService';
import { platformDomainService } from '../platform/PlatformDomainService';
import { platformContext } from '../platform/bootstrap';
import { adminPasswordMinLength, normalizeUserEmail, normalizeUserUsername } from './userAuthPolicy';

type PlatformUser = NonNullable<Awaited<ReturnType<typeof platformUserRepository.findById>>>;

function userLoginEmail(user: PlatformUser): string {
  return user.email ?? user.username ?? '';
}

function userAllowsPasswordLogin(user: PlatformUser): boolean {
  return user.passwordEnabled && Boolean(user.passwordHash);
}

function userAllowsMagicLink(user: PlatformUser): boolean {
  return user.magicLinkEnabled && Boolean(user.email?.trim());
}

function buildPlatformUrl(path: string, query?: Record<string, string>): string {
  const platform = platformContext.current();
  const domains = platformDomainService.getPublicView(platform);
  const proto = platformDomainService.resolveProto();
  const base = platformDomainService.buildAppUrl(domains, path, proto);
  if (!query || Object.keys(query).length === 0) return base;
  const params = new URLSearchParams(query);
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${params.toString()}`;
}

async function createAuthSession(user: PlatformUser, userAgent?: string) {
  const permissions = parsePlatformPermissions(user.permissions);
  const payload: Omit<AuthPayload, 'sessionId'> = {
    userId: user.id,
    email: userLoginEmail(user),
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
    details: { email: userLoginEmail(user) },
  });

  return {
    token: accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: 'PLATFORM_ADMIN' as const,
      permissions,
      passwordEnabled: user.passwordEnabled,
      magicLinkEnabled: user.magicLinkEnabled,
    },
  };
}

export const platformAuthService = {
  async login(identifier: string, password: string, userAgent?: string) {
    const user = await platformUserRepository.findByLoginIdentifier(identifier);
    if (!user || !user.active) {
      throw new AppError(401, 'Ungültige Anmeldedaten');
    }
    if (!userAllowsPasswordLogin(user)) {
      throw new AppError(401, 'Für dieses Konto ist keine Passwort-Anmeldung aktiviert.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash!);
    if (!valid) {
      throw new AppError(401, 'Ungültige Anmeldedaten');
    }

    return createAuthSession(user, userAgent);
  },

  async requestMagicLink(email: string, userAgent?: string, ipAddress?: string) {
    const user = await platformUserRepository.findByEmail(email);
    if (!user || !user.active || !userAllowsMagicLink(user)) {
      return { sent: true };
    }

    const { token } = await platformAuthLoginTokenService.createMagicLink(user.id, ipAddress, userAgent);
    const magicLink = buildPlatformUrl('/platform/login', { token });

    await mailService.sendTemplate('magic-link', user.email, {
      magicLink,
      recipientName: user.firstName,
      expiresMinutes: 15,
    });

    return { sent: true };
  },

  async verifyMagicLink(token: string, userAgent?: string) {
    const userId = await platformAuthLoginTokenService.verifyToken(token, AuthTokenType.MAGIC_LINK);
    const user = await platformUserRepository.findById(userId);
    if (!user || !user.active) {
      throw new AppError(401, 'Benutzer nicht gefunden');
    }
    return createAuthSession(user, userAgent);
  },

  async requestPasswordReset(identifier: string, ipAddress?: string, userAgent?: string) {
    const user = await platformUserRepository.findByLoginIdentifier(identifier);
    if (!user || !user.active || !userAllowsPasswordLogin(user) || !user.email?.trim()) {
      return { sent: true };
    }

    const { token } = await platformAuthLoginTokenService.createPasswordReset(user.id, ipAddress, userAgent);
    const resetLink = buildPlatformUrl('/platform/login', { resetToken: token });

    await mailService.sendTemplate('password-reset', user.email, {
      magicLink: resetLink,
      recipientName: user.firstName,
      expiresMinutes: 30,
    });

    return { sent: true };
  },

  async resetPassword(token: string, newPassword: string) {
    const userId = await platformAuthLoginTokenService.verifyToken(token, AuthTokenType.PASSWORD_RESET);
    const user = await platformUserRepository.findById(userId);
    if (!user || !user.active) {
      throw new AppError(401, 'Benutzer nicht gefunden');
    }

    const minLength = adminPasswordMinLength();
    if (newPassword.length < minLength) {
      throw new AppError(400, `Passwort muss mindestens ${minLength} Zeichen haben`);
    }

    await platformUserRepository.update(userId, {
      passwordHash: await bcrypt.hash(newPassword, 12),
      passwordEnabled: true,
    });
    await platformSessionService.revokeAllUserSessions(userId);
    return { success: true };
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
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: 'PLATFORM_ADMIN' as const,
      permissions: parsePlatformPermissions(user.permissions),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      mfaEnabled: user.mfaEnabled,
      passwordEnabled: user.passwordEnabled,
      magicLinkEnabled: user.magicLinkEnabled,
    };
  },
};
