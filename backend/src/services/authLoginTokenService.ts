import crypto from 'crypto';
import { AuthTokenType } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { requireTenantId } from '../platform/tenant/tenantScope';
import { auditService } from '../platform/bootstrap';
import { authConfigService } from './authConfigService';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateLoginCode(length: number): string {
  const max = 10 ** length;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(length, '0');
}

export const authLoginTokenService = {
  async invalidateUserTokens(userId: string): Promise<void> {
    await prisma.authLoginToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  },

  async createMagicLink(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ token: string; expiresAt: Date }> {
    const config = await authConfigService.getConfig();
    if (!config.magicLinkEnabled) {
      throw new AppError(400, 'Magic-Link-Anmeldung ist nicht aktiviert');
    }

    const tenantId = requireTenantId();
    await this.invalidateUserTokens(userId);

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + config.magicLinkTtlMinutes * 60 * 1000);

    await prisma.authLoginToken.create({
      data: {
        tenantId,
        userId,
        tokenHash: hashToken(token),
        type: AuthTokenType.MAGIC_LINK,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    await auditService.log({
      action: 'auth.magic_link.created',
      details: { userId, tenantId },
    });

    return { token, expiresAt };
  },

  async createLoginCode(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ code: string; expiresAt: Date }> {
    const config = await authConfigService.getConfig();
    if (!config.loginCodeEnabled) {
      throw new AppError(400, 'Login-Code-Anmeldung ist nicht aktiviert');
    }

    const tenantId = requireTenantId();
    await this.invalidateUserTokens(userId);

    const code = generateLoginCode(config.loginCodeLength);
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + config.loginCodeTtlMinutes * 60 * 1000);

    await prisma.authLoginToken.create({
      data: {
        tenantId,
        userId,
        tokenHash: hashToken(token),
        codeHash: hashToken(code),
        type: AuthTokenType.LOGIN_CODE,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    await auditService.log({
      action: 'auth.login_code.created',
      details: { userId, tenantId },
    });

    return { code, expiresAt };
  },

  async verifyMagicLink(token: string): Promise<string> {
    const record = await prisma.authLoginToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!record || record.type !== AuthTokenType.MAGIC_LINK) {
      throw new AppError(401, 'Ungültiger oder abgelaufener Link');
    }
    if (record.usedAt) {
      throw new AppError(401, 'Dieser Link wurde bereits verwendet');
    }
    if (record.expiresAt < new Date()) {
      throw new AppError(401, 'Dieser Link ist abgelaufen');
    }

    await prisma.authLoginToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    await auditService.log({
      action: 'auth.magic_link.used',
      details: { userId: record.userId, tenantId: record.tenantId },
    });

    return record.userId;
  },

  async verifyLoginCode(email: string, code: string): Promise<string> {
    const tenantId = requireTenantId();
    const user = await prisma.user.findFirst({
      where: { tenantId, email: email.toLowerCase().trim(), active: true },
    });
    if (!user) {
      throw new AppError(401, 'Ungültiger Code');
    }

    const records = await prisma.authLoginToken.findMany({
      where: {
        userId: user.id,
        type: AuthTokenType.LOGIN_CODE,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const codeHash = hashToken(code.trim());
    const match = records.find((r) => r.codeHash === codeHash);
    if (!match) {
      throw new AppError(401, 'Ungültiger oder abgelaufener Code');
    }

    await prisma.authLoginToken.update({
      where: { id: match.id },
      data: { usedAt: new Date() },
    });

    await auditService.log({
      action: 'auth.login_code.used',
      details: { userId: user.id, tenantId },
    });

    return user.id;
  },
};
