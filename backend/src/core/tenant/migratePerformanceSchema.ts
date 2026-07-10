import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

const MIGRATION_MARKER = 'performance_schema_v1';

/**
 * Performance-Indizes für Hot Paths (Realtime, Kitchen, Pickup).
 * Idempotent – Prisma db push legt Indizes bereits an.
 */
export async function migratePerformanceSchema(): Promise<void> {
  const marker = await prisma.$queryRaw<{ key: string }[]>`
    SELECT key FROM platform_settings WHERE key = ${MIGRATION_MARKER} LIMIT 1
  `.catch(() => [] as { key: string }[]);

  if (marker.length > 0) {
    logger.info('Performance-Schema bereits angewendet');
    return;
  }

  logger.info('Starte Performance-Schema-Migration');

  const indexExists = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'Order' AND indexname = 'Order_tenantId_eventId_status_idx'
    ) AS exists
  `.catch(() => [{ exists: false }]);

  if (!indexExists[0]?.exists) {
    const statements = [
      `CREATE INDEX IF NOT EXISTS "Order_tenantId_eventId_status_idx" ON "Order"("tenant_id", "eventId", status)`,
      `CREATE INDEX IF NOT EXISTS "Order_tenantId_updatedAt_idx" ON "Order"("tenant_id", "updatedAt" DESC)`,
      `CREATE INDEX IF NOT EXISTS "Order_eventId_status_readyAt_idx" ON "Order"("eventId", status, "readyAt") WHERE status = 'READY'`,
      `CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId")`,
      `CREATE INDEX IF NOT EXISTS "Order_tenantId_lookupToken_idx" ON "Order"("tenant_id", "lookupToken")`,
    ];
    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql);
    }
  } else {
    logger.info('Performance-Indizes bereits via Prisma vorhanden');
  }

  await prisma.$executeRaw`
    INSERT INTO platform_settings (key, value, encrypted, updated_at)
    VALUES (${MIGRATION_MARKER}, ${JSON.stringify({ appliedAt: new Date().toISOString() })}::jsonb, false, NOW())
    ON CONFLICT (key) DO NOTHING
  `;

  logger.info('Performance-Schema-Migration abgeschlossen');
}
