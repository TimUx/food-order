import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

const MIGRATION_MARKER = 'platform_v21_schema';

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
}

async function columnIsNullable(tableName: string, columnName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ is_nullable: string }[]>`
    SELECT is_nullable FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${tableName} AND column_name = ${columnName}
    LIMIT 1
  `;
  return rows[0]?.is_nullable === 'YES';
}

export async function migratePlatformV21Schema(): Promise<void> {
  const marker = await prisma.$queryRaw<{ key: string }[]>`
    SELECT key FROM platform_settings WHERE key = ${MIGRATION_MARKER} LIMIT 1
  `.catch(() => [] as { key: string }[]);

  if (marker.length > 0) {
    logger.info('Platform v2.1 Schema bereits angewendet');
    return;
  }

  logger.info('Starte Platform v2.1 Schema-Migration');

  if (!(await tableExists('auth_login_tokens'))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS auth_login_tokens (
        id UUID PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        code_hash TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS auth_login_tokens_tenant_user_idx ON auth_login_tokens(tenant_id, user_id)`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS auth_login_tokens_expires_at_idx ON auth_login_tokens(expires_at)`
    );
  }

  if (!(await columnIsNullable('User', 'password_hash'))) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN password_hash DROP NOT NULL`);
  }

  const platformDefaults: Array<{ key: string; value: unknown; encrypted?: boolean }> = [
    { key: 'platform.smtp.timeout', value: 30000 },
    { key: 'platform.auth.mode', value: 'password_or_magic' },
    { key: 'platform.auth.magicLinkTtlMinutes', value: 15 },
    { key: 'platform.auth.loginCodeTtlMinutes', value: 10 },
    { key: 'platform.auth.loginCodeLength', value: 6 },
  ];

  for (const item of platformDefaults) {
    await prisma.platformSettings.upsert({
      where: { key: item.key },
      update: {},
      create: { key: item.key, value: item.value as object, encrypted: item.encrypted ?? false },
    });
  }

  // Bestehende Mandanten als eingerichtet markieren
  await prisma.$executeRaw`
    UPDATE tenant_settings
    SET extra_json = extra_json || '{"initialSetup":{"completed":true,"currentStep":7,"data":{}}}'::jsonb
    WHERE NOT (extra_json ? 'initialSetup')
  `;

  await prisma.$executeRaw`
    INSERT INTO platform_settings (key, value, encrypted, updated_at)
    VALUES (${MIGRATION_MARKER}, ${JSON.stringify({ appliedAt: new Date().toISOString() })}::jsonb, false, NOW())
    ON CONFLICT (key) DO NOTHING
  `;

  logger.info('Platform v2.1 Schema-Migration abgeschlossen');
}
