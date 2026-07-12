import type { Request, Response, NextFunction } from 'express';
import { RESERVED_SUBDOMAINS } from '../platform/tenant/types';

const TENANT_PREFIX_PATTERN = /^\/([^/]+)\/(api|uploads)(\/|$)/;

const RESERVED_PATH_SEGMENTS = new Set<string>([
  ...RESERVED_SUBDOMAINS,
  'platform',
  'socket.io',
]);

/**
 * Entfernt den Mandanten-Pfadpräfix für Express-Routing (/slug/api → /api).
 * Die Tenant-Auflösung liest weiterhin req.originalUrl.
 */
export function createTenantPathRewriteMiddleware() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const pathname = req.originalUrl.split('?')[0] ?? req.path;
    const match = pathname.match(TENANT_PREFIX_PATTERN);
    if (!match) {
      next();
      return;
    }

    const slug = match[1].toLowerCase();
    if (RESERVED_PATH_SEGMENTS.has(slug)) {
      next();
      return;
    }

    const queryIndex = req.url.indexOf('?');
    const query = queryIndex >= 0 ? req.url.slice(queryIndex) : '';
    req.url = `${pathname.slice(slug.length + 1)}${query}`;
    next();
  };
}
