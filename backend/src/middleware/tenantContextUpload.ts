import type { Request, Response, NextFunction } from 'express';
import { tenantContext, tenantResolver, tenantService } from '../platform/bootstrap';
import type { AuthRequest } from './auth';
import { TenantContextMissingError } from '../platform/tenant/errors';

/**
 * Multer/Busboy verarbeitet Multipart-Uploads in einem eigenen Async-Kontext.
 * Dadurch kann der Mandanten-Kontext aus AsyncLocalStorage verloren gehen.
 * Dieses Middleware stellt ihn vor dem Route-Handler wieder her.
 */
export async function ensureTenantContextAfterMultipart(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (tenantContext.exists()) {
    next();
    return;
  }

  try {
    const authUser = (req as AuthRequest).user;

    if (authUser?.impersonation?.tenantId) {
      const tenant = await tenantService.findById(authUser.impersonation.tenantId);
      if (!tenant) {
        next(new TenantContextMissingError());
        return;
      }
      const contextData = await tenantService.resolveContextData(tenant);
      tenantContext.run(contextData, () => next());
      return;
    }

    const result = await tenantResolver.resolve(req);
    if (result.type === 'tenant' && result.tenant) {
      tenantContext.run(result.tenant, () => next());
      return;
    }

    if (authUser?.tenantId) {
      const tenant = await tenantService.findById(authUser.tenantId);
      if (tenant) {
        const contextData = await tenantService.resolveContextData(tenant);
        tenantContext.run(contextData, () => next());
        return;
      }
    }

    next(new TenantContextMissingError());
  } catch (error) {
    next(error);
  }
}
