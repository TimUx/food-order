import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';
import { AppError } from './errorHandler';
import { tenantWhere, optionalTenantId } from '../platform/tenant/tenantScope';
import { parsePermissionKeys, userHasPermission } from '../platform/permissions';
import { resolveUserPermissions, hasDelegatedAdminAccess } from '../core/permissions';
import type { AuthPayload } from './platformAuth';

export type { AuthPayload, ImpersonationMeta } from './platformAuth';

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
      if (payload.scope === 'platform') {
        next(new AppError(403, 'Plattform-Token nicht für Mandanten-APIs gültig'));
        return;
      }
      if (payload.impersonation) {
        const { platformSessionService } = await import('../services/platformSessionService');
        const valid = await platformSessionService.validateSession(
          payload.impersonation.platformSessionId
        );
        if (!valid) {
          next(new AppError(401, 'Impersonation-Sitzung ungültig oder abgelaufen'));
          return;
        }
      } else if (payload.sessionId) {
        const { sessionService } = await import('../services/sessionService');
        const valid = await sessionService.validateSession(payload.sessionId);
        if (!valid) {
          next(new AppError(401, 'Sitzung ungültig oder abgelaufen'));
          return;
        }
      }

      const resolvedTenantId = optionalTenantId();
      if (
        resolvedTenantId &&
        payload.tenantId &&
        payload.tenantId !== resolvedTenantId &&
        !payload.impersonation
      ) {
        next(new AppError(403, 'Token gehört zu einem anderen Mandanten'));
        return;
      }
      req.user = { ...payload, scope: payload.scope ?? 'tenant' };
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

  if (req.user.impersonation) {
    req.user.role = 'ADMIN';
    req.user.permissions = ['*'];
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
  req.user.permissions = resolveUserPermissions(user);
  (req.user as AuthPayload & { roleTemplate?: string | null }).roleTemplate = user.roleTemplate;
  next();
}

export function requireDelegatedAdmin() {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'Nicht authentifiziert'));
      return;
    }
    if (!hasDelegatedAdminAccess(req.user.role, req.user.permissions ?? [])) {
      next(new AppError(403, 'Keine Berechtigung'));
      return;
    }
    next();
  };
}

export function requireStaffPermission(permissionKey: string) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'Nicht authentifiziert'));
      return;
    }
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }
    if (!(req.user.permissions ?? []).includes(permissionKey)) {
      next(new AppError(403, 'Keine Berechtigung'));
      return;
    }
    next();
  };
}

export function requireAnyStaffPermission(...permissionKeys: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'Nicht authentifiziert'));
      return;
    }
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }
    const perms = req.user.permissions ?? [];
    if (!permissionKeys.some((k) => perms.includes(k))) {
      next(new AppError(403, 'Keine Berechtigung'));
      return;
    }
    next();
  };
}

export function requirePermissionKey(permissionKey: string) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'Nicht authentifiziert'));
      return;
    }
    if (!userHasPermission(req.user.role, req.user.permissions, permissionKey)) {
      next(new AppError(403, 'Keine Berechtigung'));
      return;
    }
    next();
  };
}
