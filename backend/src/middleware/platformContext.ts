import type { Request, Response, NextFunction } from 'express';
import type { PlatformContext } from '../platform/tenant/PlatformContext';

export function createPlatformContextMiddleware(platformContext: PlatformContext) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = platformContext.getBootData();
    platformContext.run(data, () => next());
  };
}

export function createPlatformPublicMiddleware(platformContext: PlatformContext) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (platformContext.isMaintenanceMode()) {
      res.status(503).json({
        error: platformContext.current().maintenanceMessage ?? 'Die Plattform befindet sich im Wartungsmodus.',
        code: 'PLATFORM_MAINTENANCE',
      });
      return;
    }
    next();
  };
}
