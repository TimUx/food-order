import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories';
import { AppError } from '../middleware/errorHandler';
import { AuthPayload } from '../middleware/auth';
import { resolveUserPermissions } from '../core/permissions';
import { hookSystem, tenantContext, platformContext } from '../platform/bootstrap';
import { requireTenantId } from '../platform/tenant/tenantScope';
import { CORE_HOOKS } from '../platform/types';
import { sessionService } from './sessionService';
import { authConfigService } from './authConfigService';
import { authLoginTokenService } from './authLoginTokenService';
import { mailService } from '../platform/mail/MailService';

async function buildUserResponse(user: Awaited<ReturnType<typeof userRepository.findById>>) {
  if (!user) throw new AppError(404, 'Benutzer nicht gefunden');
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.name,
    permissions: resolveUserPermissions(user),
    roleTemplate: user.roleTemplate ?? null,
  };
}

async function createAuthSession(userId: string, userAgent?: string) {
  const user = await userRepository.findById(userId);
  if (!user || !user.active) {
    throw new AppError(401, 'Benutzer nicht gefunden oder inaktiv');
  }

  const payload: Omit<AuthPayload, 'sessionId'> = {
    userId: user.id,
    email: user.email,
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
    email: user.email,
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
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = tenant?.subdomain
    ? `${tenant.subdomain}.${platform.baseDomain}`
    : platform.baseDomain;
  return `${protocol}://${host}${path}?token=${encodeURIComponent(token)}`;
}

export const authService = {
  async login(email: string, password: string, userAgent?: string) {
    const config = await authConfigService.getConfig();
    if (!config.passwordEnabled) {
      throw new AppError(400, 'Passwort-Anmeldung ist nicht aktiviert');
    }

    const user = await userRepository.findByEmail(email);
    if (!user || !user.active) {
      throw new AppError(401, 'Ungültige Anmeldedaten');
    }
    if (!user.passwordHash) {
      throw new AppError(401, 'Für dieses Konto ist kein Passwort hinterlegt. Bitte Magic Link verwenden.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
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
    if (!user || !user.active) {
      return { sent: true };
    }

    const { token } = await authLoginTokenService.createMagicLink(user.id, ipAddress, userAgent);
    const magicLink = buildMagicLinkUrl(token, loginPath);

    await mailService.sendTemplate('magic-link', user.email, {
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
    if (!user || !user.active) {
      return { sent: true };
    }

    const { code } = await authLoginTokenService.createLoginCode(user.id, ipAddress, userAgent);

    await mailService.sendTemplate('login-code', user.email, {
      code,
      recipientName: user.firstName,
      tenantName: tenantContext.current()?.name,
      expiresMinutes: config.loginCodeTtlMinutes,
    }, requireTenantId());

    return { sent: true };
  },

  async verifyMagicLink(token: string, userAgent?: string) {
    const userId = await authLoginTokenService.verifyMagicLink(token);
    return createAuthSession(userId, userAgent);
  },

  async verifyLoginCode(email: string, code: string, userAgent?: string) {
    const userId = await authLoginTokenService.verifyLoginCode(email, code);
    return createAuthSession(userId, userAgent);
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
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    roleName: 'ADMIN' | 'STAFF';
  }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError(409, 'E-Mail bereits registriert');
    }

    let passwordHash: string | null = null;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 12);
    }

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
