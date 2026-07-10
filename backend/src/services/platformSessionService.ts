import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';
import type { AuthPayload } from '../middleware/platformAuth';
import { AppError } from '../middleware/errorHandler';

const REFRESH_TOKEN_BYTES = 32;
const REFRESH_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseJwtExpiry(expiresIn: string): Date {
  const match = expiresIn.match(/^(\d+)([dhms])$/);
  if (!match) return new Date(Date.now() + 8 * 60 * 60 * 1000);
  const value = parseInt(match[1], 10);
  const multipliers: Record<string, number> = {
    s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000,
  };
  return new Date(Date.now() + value * multipliers[match[2]]);
}

export const platformSessionService = {
  async createSession(
    userId: string,
    payload: Omit<AuthPayload, 'sessionId'>,
    userAgent?: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    const refreshToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_MS);

    const session = await prisma.platformUserSession.create({
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

    return { accessToken, refreshToken, expiresAt: parseJwtExpiry(config.jwt.expiresIn) };
  },

  async refreshSession(refreshToken: string) {
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const session = await prisma.platformUserSession.findUnique({
      where: { refreshTokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new AppError(401, 'Ungültige oder abgelaufene Sitzung');
    }
    if (!session.user.active) {
      throw new AppError(401, 'Benutzer deaktiviert');
    }

    const newRefreshToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_EXPIRY_MS);

    await prisma.platformUserSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: newRefreshTokenHash, expiresAt: newExpiresAt, revokedAt: null },
    });

    const { parsePlatformPermissions } = await import('../platform/platformPermissions');
    const payload: Omit<AuthPayload, 'sessionId'> = {
      userId: session.user.id,
      email: session.user.email,
      role: 'PLATFORM_ADMIN',
      scope: 'platform',
      permissions: parsePlatformPermissions(session.user.permissions),
    };

    const accessToken = jwt.sign(
      { ...payload, sessionId: session.id } satisfies AuthPayload,
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );

    return { accessToken, refreshToken: newRefreshToken, expiresAt: parseJwtExpiry(config.jwt.expiresIn) };
  },

  async revokeSession(refreshTokenOrSessionId: string): Promise<void> {
    const byHash = await prisma.platformUserSession.findUnique({
      where: { refreshTokenHash: hashRefreshToken(refreshTokenOrSessionId) },
    });
    if (byHash) {
      await prisma.platformUserSession.update({
        where: { id: byHash.id },
        data: { revokedAt: new Date() },
      });
      return;
    }
    const byId = await prisma.platformUserSession.findUnique({ where: { id: refreshTokenOrSessionId } });
    if (byId && !byId.revokedAt) {
      await prisma.platformUserSession.update({
        where: { id: byId.id },
        data: { revokedAt: new Date() },
      });
    }
  },

  async validateSession(sessionId: string): Promise<boolean> {
    const session = await prisma.platformUserSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) return false;
    return session.user.active;
  },
};
