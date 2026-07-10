import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { tenantContext } from '../platform/bootstrap';
import { performanceMetrics } from '../platform/metrics/performanceMetrics';

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  res.setHeader('X-Request-Id', requestId);

  const start = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const path = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;

    performanceMetrics.recordApi(path, durationMs);

    const meta = {
      request_id: requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: durationMs,
      host: req.hostname,
      tenant_id: tenantContext.id() ?? null,
    };

    if (performanceMetrics.isSlowApi(durationMs)) {
      logger.warn('slow_api_request', meta);
    } else {
      logger.info('http_request', meta);
    }
  });

  next();
}
