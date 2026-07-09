import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import type { AuditLogEntry } from './types';
import { optionalTenantId } from './tenant/tenantScope';

export class AuditService {
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.platformAuditLog.create({
        data: {
          action: entry.action,
          actorId: entry.actorId ?? null,
          tenantId: optionalTenantId() ?? (entry.details?.tenantId as string | undefined) ?? null,
          moduleId: entry.moduleId ?? null,
          details: (entry.details ?? {}) as object,
        },
      });
    } catch (err) {
      logger.warn('AuditService: persist failed, logging to console', err);
      logger.info(`AUDIT ${entry.action}`, entry);
    }
  }

  async getRecent(limit = 50, moduleId?: string, tenantId?: string) {
    return prisma.platformAuditLog.findMany({
      where: {
        ...(moduleId ? { moduleId } : {}),
        ...(tenantId ? { tenantId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
