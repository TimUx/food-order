import path from 'path';
import fs from 'fs';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { AppError } from './errorHandler';
import { tenantContext } from '../platform/bootstrap';

const SAFE_FILENAME = /^[a-zA-Z0-9._-]+$/;

/**
 * Liefert Uploads nur aus, wenn der Mandanten-Kontext zur URL passt.
 * Verhindert Cross-Tenant-IDOR über erratene Pfade.
 */
export function createUploadAccessMiddleware() {
  const uploadsRoot = path.resolve(config.uploadsDir);

  return (req: Request, res: Response, next: NextFunction): void => {
    const segments = req.path.split('/').filter(Boolean);
    if (segments.length < 2) {
      next(new AppError(404, 'Datei nicht gefunden'));
      return;
    }

    const [pathTenantId, filename] = segments;
    if (!SAFE_FILENAME.test(filename)) {
      next(new AppError(400, 'Ungültiger Dateiname'));
      return;
    }

    const currentTenantId = tenantContext.id();
    if (!currentTenantId || currentTenantId !== pathTenantId) {
      next(new AppError(403, 'Kein Zugriff auf diese Datei'));
      return;
    }

    const tenantDir = path.resolve(uploadsRoot, pathTenantId);
    const filePath = path.resolve(tenantDir, filename);

    if (!filePath.startsWith(tenantDir + path.sep) && filePath !== tenantDir) {
      next(new AppError(400, 'Ungültiger Pfad'));
      return;
    }

    if (!fs.existsSync(filePath)) {
      next(new AppError(404, 'Datei nicht gefunden'));
      return;
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) next(new AppError(404, 'Datei nicht gefunden'));
    });
  };
}
