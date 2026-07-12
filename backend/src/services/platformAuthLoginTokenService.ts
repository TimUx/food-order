import crypto from 'crypto';
import { AuthTokenType } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { auditService } from '../platform/bootstrap';

const PASSWORD_RESET_TTL_MINUTES = 30;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export const platformAuthLoginTokenService = {
  async invalidateUserTokens(userId: string): Promise<void> {
    await prisma.platformAuthLoginToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  },

  async createMagicLink(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ token: string; expiresAt: Date }> {
    await this.invalidateUserTokens(userId);
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.platformAuthLoginToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        type: AuthTokenType.MAGIC_LINK,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    await auditService.log({
      action: 'platform.auth.magic_link.created',
      actorId: userId,
      details: { userId },
    });

    return { token, expiresAt };
  },

  async createPasswordReset(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ token: string; expiresAt: Date }> {
    await this.invalidateUserTokens(userId);
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

    await prisma.platformAuthLoginToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        type: AuthTokenType.PASSWORD_RESET,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    await auditService.log({
      action: 'platform.auth.password_reset.created',
      actorId: userId,
      details: { userId },
    });

    return { token, expiresAt };
  },

  async verifyToken(token: string, expectedType: AuthTokenType): Promise<string> {
    const record = await prisma.platformAuthLoginToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!record || record.type !== expectedType) {
      throw new AppError(401, 'Ungültiger oder abgelaufener Link');
    }
    if (record.usedAt) {
      throw new AppError(401, 'Dieser Link wurde bereits verwendet');
    }
    if (record.expiresAt < new Date()) {
      throw new AppError(401, 'Dieser Link ist abgelaufen');
    }

    await prisma.platformAuthLoginToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return record.userId;
  },
};
