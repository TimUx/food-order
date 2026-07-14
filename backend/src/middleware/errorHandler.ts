import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validierungsfehler',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2021' || err.code === 'P2022') {
      res.status(503).json({
        error: 'Datenbank-Schema veraltet. Bitte Migrationen ausführen (prisma migrate deploy).',
        code: 'SCHEMA_OUTDATED',
      });
      return;
    }
    if (err.code === 'P2003') {
      res.status(409).json({
        error: 'Der Datensatz wird noch verwendet und kann nicht gelöscht werden.',
        code: 'FOREIGN_KEY_CONSTRAINT',
        ...(process.env.FESTSCHMIEDE_CI === '1' ? { detail: err.meta } : {}),
      });
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    res.status(503).json({
      error: 'Datenbankverbindung fehlgeschlagen.',
      code: 'DATABASE_UNAVAILABLE',
    });
    return;
  }

  const prismaMessage = err instanceof Error ? err.message : '';
  if (/column .* does not exist|relation .* does not exist/i.test(prismaMessage)) {
    res.status(503).json({
      error: 'Datenbank-Schema veraltet. Bitte Migrationen ausführen (prisma migrate deploy).',
      code: 'SCHEMA_OUTDATED',
    });
    return;
  }

  logger.error('Unbehandelter Fehler', err);
  res.status(500).json({ error: 'Interner Serverfehler' });
}
