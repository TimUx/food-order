import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

const MIGRATION_MARKER = 'modules_tenant_schema_v1';

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName} AND column_name = ${columnName}
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
}

/**
 * Idempotente Schema-Härtung für mandantenfähige Modultabellen (Phase 4).
 */
export async function migrateModulesTenantSchema(defaultTenantId: string): Promise<void> {
  const marker = await prisma.$queryRaw<{ key: string }[]>`
    SELECT key FROM platform_settings WHERE key = ${MIGRATION_MARKER} LIMIT 1
  `.catch(() => [] as { key: string }[]);

  if (marker.length > 0) {
    logger.info('Modul-Tenant-Schema bereits angewendet');
    return;
  }

  logger.info('Starte Modul-Tenant-Schema-Migration', { tenant_id: defaultTenantId });

  if (await tableExists('payment_events') && !(await columnExists('payment_events', 'tenant_id'))) {
    const statements = [
      `ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS tenant_id TEXT`,
      `UPDATE payment_events pe SET tenant_id = p.tenant_id FROM payments p WHERE pe.payment_id = p.id AND pe.tenant_id IS NULL`,
      `UPDATE payment_events SET tenant_id = '${defaultTenantId}' WHERE tenant_id IS NULL`,
      `ALTER TABLE payment_events ALTER COLUMN tenant_id SET NOT NULL`,
      `CREATE INDEX IF NOT EXISTS payment_events_tenant_id_idx ON payment_events(tenant_id)`,
      `DROP INDEX IF EXISTS idx_payment_events_external`,
      `CREATE UNIQUE INDEX IF NOT EXISTS payment_events_tenant_external_key ON payment_events(tenant_id, external_event_id) WHERE external_event_id IS NOT NULL`,
      `ALTER TABLE payment_audit ADD COLUMN IF NOT EXISTS tenant_id TEXT`,
      `UPDATE payment_audit pa SET tenant_id = p.tenant_id FROM payments p WHERE pa.payment_id = p.id AND pa.tenant_id IS NULL`,
      `UPDATE payment_audit SET tenant_id = '${defaultTenantId}' WHERE tenant_id IS NULL`,
      `ALTER TABLE payment_audit ALTER COLUMN tenant_id SET NOT NULL`,
      `CREATE INDEX IF NOT EXISTS payment_audit_tenant_id_idx ON payment_audit(tenant_id)`,
    ];
    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql);
    }
  }

  await prisma.$executeRaw`
    INSERT INTO platform_settings (key, value, encrypted, updated_at)
    VALUES (${MIGRATION_MARKER}, ${JSON.stringify({ appliedAt: new Date().toISOString() })}::jsonb, false, NOW())
    ON CONFLICT (key) DO NOTHING
  `;

  logger.info('Modul-Tenant-Schema-Migration abgeschlossen');
}
