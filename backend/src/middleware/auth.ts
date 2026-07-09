import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';
import { AppError } from './errorHandler';
import { tenantWhere } from '../platform/tenant/tenantScope';
import { parsePermissionKeys } from '../platform/permissions';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  permissions?: string[];
  sessionId?: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new AppError(401, 'Nicht authentifiziert'));
    return;
  }

  const token = header.slice(7);
  void (async () => {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as AuthPayload;
      if (payload.sessionId) {
        const { sessionService } = await import('../services/sessionService');
        const valid = await sessionService.validateSession(payload.sessionId);
        if (!valid) {
          next(new AppError(401, 'Sitzung ungültig oder abgelaufen'));
          return;
        }
      }
      req.user = payload;
      next();
    } catch {
      next(new AppError(401, 'Ungültiges oder abgelaufenes Token'));
    }
  })();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'Nicht authentifiziert'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, 'Keine Berechtigung'));
      return;
    }
    next();
  };
}

export async function loadUser(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    next();
    return;
  }
  const user = await prisma.user.findFirst({
    where: tenantWhere({ id: req.user.userId }),
    include: { role: true },
  });
  if (!user || !user.active) {
    next(new AppError(401, 'Benutzer nicht gefunden oder deaktiviert'));
    return;
  }
  req.user.role = user.role.name;
  req.user.permissions = parsePermissionKeys(user.role.permissions);
  next();
}
