import fs from 'fs';
import path from 'path';
import { prisma } from '../../config/database';
import { config } from '../../config';
import { isMissingPaymentsSchema } from '../../../modules/payment/repositories/paymentRepository';
import { logger } from '../../utils/logger';

async function purgePaymentModuleData(tenantId: string): Promise<void> {
  const deletes = [
    () => prisma.$executeRaw`DELETE FROM payment_events WHERE tenant_id = ${tenantId}`,
    () => prisma.$executeRaw`DELETE FROM payment_audit WHERE tenant_id = ${tenantId}`,
    () => prisma.$executeRaw`
      DELETE FROM payment_audit
      WHERE payment_id IN (SELECT id FROM payments WHERE tenant_id = ${tenantId})
    `,
    () => prisma.$executeRaw`DELETE FROM payments WHERE tenant_id = ${tenantId}`,
    () => prisma.$executeRaw`DELETE FROM payment_provider_config WHERE tenant_id = ${tenantId}`,
  ];

  for (const run of deletes) {
    try {
      await run();
    } catch (err) {
      if (isMissingPaymentsSchema(err)) continue;
      throw err;
    }
  }
}

export async function deleteTenantUploads(tenantId: string): Promise<void> {
  const uploadDir = path.resolve(config.uploadsDir, tenantId);
  try {
    await fs.promises.rm(uploadDir, { recursive: true, force: true });
  } catch (err) {
    logger.warn('TenantPurgeService: Upload-Verzeichnis konnte nicht gelöscht werden', {
      tenantId,
      uploadDir,
      err,
    });
  }
}

export class TenantPurgeService {
  async purge(tenantId: string, slug?: string): Promise<void> {
    await purgePaymentModuleData(tenantId);

    await prisma.$transaction(
      async (tx) => {
        await tx.platformAuditLog.deleteMany({ where: { tenantId } });
        await tx.tenantApplication.deleteMany({
          where: slug
            ? { OR: [{ tenantId }, { requestedSubdomain: slug }] }
            : { tenantId },
        });
        await tx.moduleMigration.deleteMany({ where: { tenantId } });
        await tx.tenantModule.deleteMany({ where: { tenantId } });
        await tx.order.deleteMany({ where: { tenantId } });
        await tx.event.deleteMany({ where: { tenantId } });
        await tx.foodItem.deleteMany({ where: { tenantId } });
        await tx.customer.deleteMany({ where: { tenantId } });
        await tx.user.deleteMany({ where: { tenantId } });
        await tx.tenant.delete({ where: { id: tenantId } });
      },
      { timeout: 120_000 }
    );

    await deleteTenantUploads(tenantId);
  }
}

export const tenantPurgeService = new TenantPurgeService();
