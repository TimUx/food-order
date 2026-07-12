import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';
import { AuthPayload } from '../middleware/platformAuth';
import { AppError } from '../middleware/errorHandler';
import { assertTenantOwnership, optionalTenantId } from '../platform/tenant/tenantScope';

const REFRESH_TOKEN_BYTES = 32;
const REFRESH_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseJwtExpiry(expiresIn: string): Date {
  const match = expiresIn.match(/^(\d+)([dhms])$/);
  if (!match) {
    return new Date(Date.now() + 8 * 60 * 60 * 1000);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return new Date(Date.now() + value * multipliers[unit]);
}

export const sessionService = {
  async createSession(
    userId: string,
    payload: Omit<AuthPayload, 'sessionId'>,
    userAgent?: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    const refreshToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_MS);

    const session = await prisma.userSession.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt,
        userAgent: userAgent ?? null,
      },
    });

    const accessToken = jwt.sign(
      { ...payload, sessionId: session.id } satisfies AuthPayload,
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );

    return {
      accessToken,
      refreshToken,
      expiresAt: parseJwtExpiry(config.jwt.expiresIn),
    };
  },

  async refreshSession(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const session = await prisma.userSession.findUnique({
      where: { refreshTokenHash },
      include: { user: { include: { role: true } } },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new AppError(401, 'Ungültige oder abgelaufene Sitzung');
    }
    if (!session.user.active) {
      throw new AppError(401, 'Benutzer deaktiviert');
    }
    const tenantId = optionalTenantId();
    if (tenantId) assertTenantOwnership(session.user.tenantId);

    const newRefreshToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_EXPIRY_MS);

    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: newExpiresAt,
        revokedAt: null,
      },
    });

    const payload: Omit<AuthPayload, 'sessionId'> = {
      userId: session.user.id,
      email: session.user.email ?? session.user.username ?? '',
      role: session.user.role.name,
      scope: 'tenant',
      tenantId: session.user.tenantId,
    };

    const accessToken = jwt.sign(
      { ...payload, sessionId: session.id } satisfies AuthPayload,
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt: parseJwtExpiry(config.jwt.expiresIn),
    };
  },

  async revokeSession(refreshTokenOrSessionId: string): Promise<void> {
    const byHash = await prisma.userSession.findUnique({
      where: { refreshTokenHash: hashRefreshToken(refreshTokenOrSessionId) },
    });
    if (byHash) {
      await prisma.userSession.update({
        where: { id: byHash.id },
        data: { revokedAt: new Date() },
      });
      return;
    }

    const byId = await prisma.userSession.findUnique({
      where: { id: refreshTokenOrSessionId },
    });
    if (byId && !byId.revokedAt) {
      await prisma.userSession.update({
        where: { id: byId.id },
        data: { revokedAt: new Date() },
      });
    }
  },

  async revokeAllUserSessions(userId: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async validateSession(sessionId: string): Promise<boolean> {
    const session = await prisma.userSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return false;
    }
    const tenantId = optionalTenantId();
    if (tenantId) assertTenantOwnership(session.user.tenantId);
    return session.user.active;
  },
};
