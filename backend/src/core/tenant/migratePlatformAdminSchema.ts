import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

const MIGRATION_MARKER = 'platform_admin_schema_v1';

/**
 * Idempotente Schema-Migration für Plattform-Administration (Phase 3).
 */
export async function migratePlatformAdminSchema(): Promise<void> {
  const marker = await prisma.$queryRaw<{ key: string }[]>`
    SELECT key FROM platform_settings WHERE key = ${MIGRATION_MARKER} LIMIT 1
  `.catch(() => [] as { key: string }[]);

  if (marker.length > 0) {
    logger.info('Plattform-Admin-Schema bereits angewendet');
    return;
  }

  logger.info('Starte Plattform-Admin-Schema-Migration');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS platform_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      permissions JSONB NOT NULL DEFAULT '[]',
      mfa_enabled BOOLEAN NOT NULL DEFAULT false,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS platform_user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
      refresh_token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS platform_user_sessions_user_id_idx ON platform_user_sessions(user_id);
  `);

  const defaults: Array<{ key: string; value: unknown }> = [
    { key: 'platform.defaults.modules', value: ['payment', 'notifications', 'legal'] },
    { key: 'platform.registration.requireApproval', value: true },
    { key: 'platform.security.passwordMinLength', value: 8 },
    { key: 'platform.security.sessionTimeoutHours', value: 8 },
    { key: 'platform.security.rateLimitEnabled', value: true },
    { key: 'platform.network.corsOrigins', value: ['http://localhost:5173'] },
    { key: 'platform.network.trustedProxies', value: ['127.0.0.1', '::1'] },
    { key: 'platform.branding.primaryColor', value: '#1565c0' },
    { key: 'platform.branding.footerText', value: 'FestManager Platform' },
  ];

  for (const item of defaults) {
    await prisma.platformSettings.upsert({
      where: { key: item.key },
      update: {},
      create: { key: item.key, value: item.value as object },
    });
  }

  await prisma.$executeRaw`
    INSERT INTO platform_settings (key, value, encrypted, "updatedAt")
    VALUES (${MIGRATION_MARKER}, ${JSON.stringify({ appliedAt: new Date().toISOString() })}::jsonb, false, NOW())
    ON CONFLICT (key) DO NOTHING
  `;

  logger.info('Plattform-Admin-Schema-Migration abgeschlossen');
}
