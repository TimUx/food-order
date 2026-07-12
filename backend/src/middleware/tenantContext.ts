import type { Request, Response, NextFunction } from 'express';
import type { AuthPayload } from '../middleware/platformAuth';
import type { TenantContext } from '../platform/tenant/TenantContext';
import type { TenantResolver } from '../platform/tenant/TenantResolver';
import type { TenantService } from '../platform/tenant/TenantService';
import { TenantContextRequiredError } from '../platform/tenant/errors';

const PLATFORM_ONLY_PREFIXES = ['/api/platform', '/platform'];
const TENANT_OPTIONAL_PATHS = new Set([
  '/api/health',
  '/health',
  '/api/public/routing-config',
  '/api/public/platform',
  '/api/public/platform/legal-links',
  '/api/public/tenant-applications',
]);

function requiresTenantContext(path: string): boolean {
  if (TENANT_OPTIONAL_PATHS.has(path)) return false;
  if (path.startsWith('/api/public/platform/legal/')) return false;
  if (PLATFORM_ONLY_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;
  return path.startsWith('/api/') || path.startsWith('/uploads/');
}

export function createTenantContextMiddleware(
  tenantContext: TenantContext,
  tenantResolver: TenantResolver,
  tenantService: TenantService
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUser = (req as Request & { user?: AuthPayload }).user;

      if (authUser?.impersonation?.tenantId) {
        const tenant = await tenantService.findById(authUser.impersonation.tenantId);
        if (!tenant) {
          next(new Error('Impersonation-Mandant nicht gefunden'));
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

      if (result.type === 'platform' && requiresTenantContext(req.path)) {
        next(new TenantContextRequiredError());
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Alias gemäß Architektur-Dokumentation (TenantResolverMiddleware). */
export const createTenantResolverMiddleware = createTenantContextMiddleware;
