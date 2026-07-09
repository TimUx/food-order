import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

const MIGRATION_MARKER = 'notification_tenant_schema_v1';

export async function migrateNotificationTenantSchema(): Promise<void> {
  const marker = await prisma.$queryRaw<{ key: string }[]>`
    SELECT key FROM platform_settings WHERE key = ${MIGRATION_MARKER} LIMIT 1
  `.catch(() => [] as { key: string }[]);

  if (marker.length > 0) {
    logger.info('Notification-Tenant-Schema bereits angewendet');
    return;
  }

  logger.info('Starte Notification-Tenant-Schema-Migration');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS notification_deliveries (
      id UUID PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      recipient TEXT,
      status TEXT NOT NULL,
      error_message TEXT,
      smtp_source TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS notification_deliveries_tenant_id_idx ON notification_deliveries(tenant_id);
    CREATE INDEX IF NOT EXISTS notification_deliveries_created_at_idx ON notification_deliveries(created_at DESC);
  `);

  const platformSmtpDefaults: Array<{ key: string; value: unknown; encrypted?: boolean }> = [
    { key: 'platform.smtp.enabled', value: false },
    { key: 'platform.smtp.host', value: '' },
    { key: 'platform.smtp.port', value: 587 },
    { key: 'platform.smtp.user', value: '' },
    { key: 'platform.smtp.pass', value: '', encrypted: true },
    { key: 'platform.smtp.from', value: 'noreply@festmanager.org' },
    { key: 'platform.smtp.senderName', value: 'FestManager' },
    { key: 'platform.smtp.replyTo', value: '' },
    { key: 'platform.smtp.secure', value: false },
    { key: 'platform.smtp.useTls', value: true },
  ];

  for (const item of platformSmtpDefaults) {
    await prisma.platformSettings.upsert({
      where: { key: item.key },
      update: {},
      create: { key: item.key, value: item.value as object, encrypted: item.encrypted ?? false },
    });
  }

  await prisma.$executeRaw`
    INSERT INTO platform_settings (key, value, encrypted, "updatedAt")
    VALUES (${MIGRATION_MARKER}, ${JSON.stringify({ appliedAt: new Date().toISOString() })}::jsonb, false, NOW())
    ON CONFLICT (key) DO NOTHING
  `;

  logger.info('Notification-Tenant-Schema-Migration abgeschlossen');
}
