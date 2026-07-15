import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories';
import { AppError } from '../middleware/errorHandler';
import { AuthPayload } from '../middleware/auth';
import { resolveUserPermissions, parseStoredRoleTemplates } from '../core/permissions';
import { hookSystem, tenantContext, platformContext } from '../platform/bootstrap';
import { platformDomainService } from '../platform/PlatformDomainService';
import { requireTenantId } from '../platform/tenant/tenantScope';
import { CORE_HOOKS } from '../platform/types';
import { sessionService } from './sessionService';
import { ensureSystemRole } from '../core/roles/ensureSystemRoles';
import { authConfigService } from './authConfigService';
import { authLoginTokenService } from './authLoginTokenService';
import { mailService } from '../platform/mail/MailService';
import {
  adminPasswordMinLength,
  staffPasswordMinLength,
  validateAuthFlags,
} from './userAuthPolicy';

type TenantUser = NonNullable<Awaited<ReturnType<typeof userRepository.findById>>>;

function userLoginEmail(user: TenantUser): string {
  return user.email ?? user.username ?? '';
}

async function buildUserResponse(user: TenantUser) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.name,
    permissions: resolveUserPermissions(user),
    roleTemplate: user.roleTemplate ?? null,
    roleTemplates: parseStoredRoleTemplates(user),
    passwordEnabled: user.passwordEnabled,
    magicLinkEnabled: user.magicLinkEnabled,
    notificationEmailsEnabled: user.notificationEmailsEnabled,
  };
}

function userAllowsPasswordLogin(user: TenantUser): boolean {
  return user.passwordEnabled && Boolean(user.passwordHash);
}

function userAllowsMagicLink(user: TenantUser): boolean {
  return user.magicLinkEnabled && Boolean(user.email?.trim());
}

async function createAuthSession(userId: string, userAgent?: string) {
  const user = await userRepository.findById(userId);
  if (!user || !user.active) {
    throw new AppError(401, 'Benutzer nicht gefunden oder inaktiv');
  }

  const payload: Omit<AuthPayload, 'sessionId'> = {
    userId: user.id,
    email: userLoginEmail(user),
    role: user.role.name,
    scope: 'tenant',
    tenantId: requireTenantId(),
  };

  const { accessToken, refreshToken } = await sessionService.createSession(
    user.id,
    payload,
    userAgent
  );

  hookSystem.emitAsync(CORE_HOOKS.USER_LOGIN, {
    userId: user.id,
    email: userLoginEmail(user),
    role: user.role.name,
  });

  return {
    token: accessToken,
    refreshToken,
    user: await buildUserResponse(user),
  };
}

function buildMagicLinkUrl(token: string, path: string): string {
  const tenant = tenantContext.current();
  const platform = platformContext.current();
  const domains = platformDomainService.getPublicView(platform);
  const proto = platformDomainService.resolveProto();

  if (tenant?.slug) {
    const base = platformDomainService.buildTenantUrl(domains, tenant.slug, path, proto);
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}token=${encodeURIComponent(token)}`;
  }

  const origin = platformDomainService.buildAppUrl(domains, path, proto);
  const separator = origin.includes('?') ? '&' : '?';
  return `${origin}${separator}token=${encodeURIComponent(token)}`;
}

function buildPasswordResetUrl(token: string, path: string): string {
  const base = buildMagicLinkUrl('', path).replace(/[?&]token=$/, '');
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}resetToken=${encodeURIComponent(token)}`;
}

export const authService = {
  async login(identifier: string, password: string, userAgent?: string) {
    const config = await authConfigService.getConfig();
    if (!config.passwordEnabled) {
      throw new AppError(400, 'Passwort-Anmeldung ist nicht aktiviert');
    }

    const user = await userRepository.findByLoginIdentifier(identifier);
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

    return createAuthSession(user.id, userAgent);
  },

  async requestMagicLink(email: string, loginPath: string, userAgent?: string, ipAddress?: string) {
    const config = await authConfigService.getConfig();
    if (!config.magicLinkEnabled) {
      throw new AppError(400, 'Magic-Link-Anmeldung ist nicht aktiviert');
    }

    const user = await userRepository.findByEmail(email);
    if (!user || !user.active || !userAllowsMagicLink(user)) {
      return { sent: true };
    }

    const { token } = await authLoginTokenService.createMagicLink(user.id, ipAddress, userAgent);
    const magicLink = buildMagicLinkUrl(token, loginPath);

    await mailService.sendTemplate('magic-link', user.email!, {
      magicLink,
      recipientName: user.firstName,
      tenantName: tenantContext.current()?.name,
      expiresMinutes: config.magicLinkTtlMinutes,
    }, requireTenantId());

    return { sent: true };
  },

  async requestLoginCode(email: string, userAgent?: string, ipAddress?: string) {
    const config = await authConfigService.getConfig();
    if (!config.loginCodeEnabled) {
      throw new AppError(400, 'Login-Code-Anmeldung ist nicht aktiviert');
    }

    const user = await userRepository.findByEmail(email);
    if (!user || !user.active || !userAllowsMagicLink(user)) {
      return { sent: true };
    }

    const { code } = await authLoginTokenService.createLoginCode(user.id, ipAddress, userAgent);

    await mailService.sendTemplate('login-code', user.email!, {
      code,
      recipientName: user.firstName,
      tenantName: tenantContext.current()?.name,
      expiresMinutes: config.loginCodeTtlMinutes,
    }, requireTenantId());

    return { sent: true };
  },

  async requestPasswordReset(identifier: string, loginPath: string, ipAddress?: string, userAgent?: string) {
    const user = await userRepository.findByLoginIdentifier(identifier);
    if (!user || !user.active || !userAllowsPasswordLogin(user) || !user.email?.trim()) {
      return { sent: true };
    }

    const { token } = await authLoginTokenService.createPasswordReset(user.id, ipAddress, userAgent);
    const resetLink = buildPasswordResetUrl(token, loginPath);

    await mailService.sendTemplate('password-reset', user.email, {
      magicLink: resetLink,
      recipientName: user.firstName,
      tenantName: tenantContext.current()?.name,
      expiresMinutes: 30,
    }, requireTenantId());

    return { sent: true };
  },

  async resetPassword(token: string, newPassword: string) {
    const userId = await authLoginTokenService.verifyPasswordReset(token);
    const user = await userRepository.findById(userId);
    if (!user || !user.active) {
      throw new AppError(401, 'Benutzer nicht gefunden');
    }

    const minLength = user.role.name === 'STAFF' ? staffPasswordMinLength() : adminPasswordMinLength();
    if (newPassword.length < minLength) {
      throw new AppError(400, `Passwort muss mindestens ${minLength} Zeichen haben`);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await userRepository.update(userId, {
      passwordHash,
      passwordEnabled: true,
    });

    await sessionService.revokeAllUserSessions(userId);
    return { success: true };
  },

  async verifyMagicLink(token: string, userAgent?: string) {
    const userId = await authLoginTokenService.verifyMagicLink(token);
    return createAuthSession(userId, userAgent);
  },

  async verifyLoginCode(email: string, code: string, userAgent?: string) {
    const userId = await authLoginTokenService.verifyLoginCode(email, code);
    return createAuthSession(userId, userAgent);
  },

  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      username?: string;
      passwordEnabled?: boolean;
      magicLinkEnabled?: boolean;
      notificationEmailsEnabled?: boolean;
      currentPassword?: string;
      newPassword?: string;
    }
  ) {
    const user = await userRepository.findById(userId);
    if (!user || !user.active) {
      throw new AppError(404, 'Benutzer nicht gefunden');
    }
    if (user.role.name !== 'ADMIN') {
      throw new AppError(403, 'Nur Administratoren können ihr Profil bearbeiten');
    }

    const nextEmail = data.email !== undefined ? (data.email.trim() || null) : user.email;
    const nextUsername = data.username !== undefined ? (data.username.trim().toLowerCase() || null) : user.username;
    const nextPasswordEnabled = data.passwordEnabled ?? user.passwordEnabled;
    const nextMagicLinkEnabled = data.magicLinkEnabled ?? user.magicLinkEnabled;
    const nextNotificationEmailsEnabled =
      data.notificationEmailsEnabled ?? user.notificationEmailsEnabled;

    if (!nextEmail?.trim()) {
      throw new AppError(400, 'Administratoren benötigen eine E-Mail-Adresse');
    }

    if (nextNotificationEmailsEnabled && !nextEmail.trim()) {
      throw new AppError(400, 'E-Mail-Benachrichtigungen erfordern eine E-Mail-Adresse');
    }

    if (nextUsername) {
      const conflict = await userRepository.findByUsername(nextUsername);
      if (conflict && conflict.id !== userId) {
        throw new AppError(409, 'Benutzername bereits vergeben');
      }
    }

    if (nextEmail && nextEmail !== user.email) {
      const conflict = await userRepository.findByEmail(nextEmail);
      if (conflict && conflict.id !== userId) {
        throw new AppError(409, 'E-Mail bereits registriert');
      }
    }

    let nextPasswordHash = user.passwordHash;
    if (data.newPassword) {
      const minLength = adminPasswordMinLength();
      if (data.newPassword.length < minLength) {
        throw new AppError(400, `Passwort muss mindestens ${minLength} Zeichen haben`);
      }
      if (user.passwordHash) {
        if (!data.currentPassword) {
          throw new AppError(400, 'Aktuelles Passwort erforderlich');
        }
        const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
        if (!valid) throw new AppError(401, 'Aktuelles Passwort ist falsch');
      }
      nextPasswordHash = await bcrypt.hash(data.newPassword, 12);
    } else if (!nextPasswordEnabled) {
      nextPasswordHash = null;
    }

    validateAuthFlags(
      { passwordEnabled: nextPasswordEnabled, magicLinkEnabled: nextMagicLinkEnabled },
      user.role.name,
      nextEmail,
      nextPasswordHash
    );

    const updated = await userRepository.update(userId, {
      firstName: data.firstName?.trim() ?? user.firstName,
      lastName: data.lastName?.trim() ?? user.lastName,
      email: nextEmail,
      username: nextUsername,
      passwordEnabled: nextPasswordEnabled,
      magicLinkEnabled: nextMagicLinkEnabled,
      notificationEmailsEnabled: nextNotificationEmailsEnabled,
      passwordHash: nextPasswordHash,
    });

    return buildUserResponse(updated);
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
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, 'Benutzer nicht gefunden');
    }
    await sessionService.revokeAllUserSessions(userId);
  },

  async createUser(data: {
    email?: string;
    username?: string;
    password?: string;
    firstName: string;
    lastName: string;
    roleName: 'ADMIN' | 'STAFF';
    passwordEnabled?: boolean;
    magicLinkEnabled?: boolean;
  }) {
    const existingEmail = data.email ? await userRepository.findByEmail(data.email) : null;
    if (existingEmail) {
      throw new AppError(409, 'E-Mail bereits registriert');
    }
    const existingUsername = data.username ? await userRepository.findByUsername(data.username) : null;
    if (existingUsername) {
      throw new AppError(409, 'Benutzername bereits vergeben');
    }

    let passwordHash: string | null = null;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 12);
    }

    const role = await ensureSystemRole(data.roleName);

    return userRepository.create({
      email: data.email ?? null,
      username: data.username ?? null,
      passwordHash,
      passwordEnabled: data.passwordEnabled ?? false,
      magicLinkEnabled: data.magicLinkEnabled ?? true,
      firstName: data.firstName,
      lastName: data.lastName,
      roleId: role.id,
    });
  },
};
