import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './errorHandler';
import { hasPlatformPermission, parsePlatformPermissions } from '../platform/platformPermissions';

export type AuthScope = 'tenant' | 'platform';

export interface ImpersonationMeta {
  platformUserId: string;
  platformSessionId: string;
  tenantId: string;
  tenantName: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  scope: AuthScope;
  permissions?: string[];
  sessionId?: string;
  impersonation?: ImpersonationMeta;
}

export interface PlatformAuthRequest extends Request {
  platformUser?: AuthPayload;
}

export function authenticatePlatform(
  req: PlatformAuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new AppError(401, 'Nicht authentifiziert'));
    return;
  }

  const token = header.slice(7);
  void (async () => {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as AuthPayload;
      if (payload.scope !== 'platform') {
        next(new AppError(403, 'Kein Plattform-Zugriff'));
        return;
      }
      if (payload.sessionId) {
        const { platformSessionService } = await import('../services/platformSessionService');
        const valid = await platformSessionService.validateSession(payload.sessionId);
        if (!valid) {
          next(new AppError(401, 'Sitzung ungültig oder abgelaufen'));
          return;
        }
      }
      req.platformUser = payload;
      next();
    } catch {
      next(new AppError(401, 'Ungültiges oder abgelaufenes Token'));
    }
  })();
}

export async function loadPlatformUser(
  req: PlatformAuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.platformUser) {
    next();
    return;
  }
  const { platformUserRepository } = await import('../repositories/platformUserRepository');
  const user = await platformUserRepository.findById(req.platformUser.userId);
  if (!user || !user.active) {
    next(new AppError(401, 'Plattformbenutzer nicht gefunden oder deaktiviert'));
    return;
  }
  req.platformUser.permissions = parsePlatformPermissions(user.permissions);
  next();
}

export function requirePlatformPermission(...permissions: string[]) {
  return (req: PlatformAuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.platformUser) {
      next(new AppError(401, 'Nicht authentifiziert'));
      return;
    }
    const userPerms = req.platformUser.permissions ?? [];
    const allowed = permissions.some((p) => hasPlatformPermission(userPerms, p));
    if (!allowed) {
      next(new AppError(403, 'Keine Berechtigung'));
      return;
    }
    next();
  };
}

export function rejectPlatformScopeOnTenantRoutes(
  req: Request & { user?: AuthPayload },
  _res: Response,
  next: NextFunction
): void {
  if (req.user?.scope === 'platform') {
    next(new AppError(403, 'Plattform-Token nicht für Mandanten-APIs gültig'));
    return;
  }
  next();
}
