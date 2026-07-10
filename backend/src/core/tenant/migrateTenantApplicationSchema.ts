import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

const MIGRATION_MARKER = 'tenant_application_schema_v1';

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
}

export async function migrateTenantApplicationSchema(): Promise<void> {
  const marker = await prisma.$queryRaw<{ key: string }[]>`
    SELECT key FROM platform_settings WHERE key = ${MIGRATION_MARKER} LIMIT 1
  `.catch(() => [] as { key: string }[]);

  if (marker.length > 0) {
    logger.info('Tenant-Application-Schema bereits angewendet');
    return;
  }

  logger.info('Starte Tenant-Application-Schema-Migration');

  if (!(await tableExists('tenant_applications'))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE tenant_applications (
        id TEXT PRIMARY KEY,
        organization TEXT NOT NULL,
        organization_type TEXT NOT NULL,
        contact_name TEXT NOT NULL,
        street TEXT NOT NULL,
        postal_code TEXT NOT NULL,
        city TEXT NOT NULL,
        country TEXT NOT NULL DEFAULT 'Deutschland',
        email TEXT NOT NULL,
        phone TEXT,
        website TEXT,
        member_count INTEGER,
        events_per_year INTEGER,
        reason TEXT NOT NULL,
        desired_features TEXT NOT NULL,
        free_tier_justification TEXT NOT NULL,
        planned_usage TEXT NOT NULL,
        notes TEXT,
        requested_subdomain TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'NEW',
        admin_comment TEXT,
        reviewed_by TEXT,
        reviewed_at TIMESTAMPTZ,
        tenant_id TEXT,
        privacy_accepted BOOLEAN NOT NULL DEFAULT true,
        terms_accepted BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS tenant_applications_status_idx ON tenant_applications(status)`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS tenant_applications_email_idx ON tenant_applications(email)`
    );
  }

  if (!(await tableExists('platform_legal_pages'))) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE platform_legal_pages (
        id TEXT PRIMARY KEY,
        page_type TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        enabled BOOLEAN NOT NULL DEFAULT true,
        published BOOLEAN NOT NULL DEFAULT false,
        content_html TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  await prisma.$executeRaw`
    INSERT INTO platform_settings (key, value, encrypted, updated_at)
    VALUES (${MIGRATION_MARKER}, ${JSON.stringify({ appliedAt: new Date().toISOString() })}::jsonb, false, NOW())
    ON CONFLICT (key) DO NOTHING
  `;

  logger.info('Tenant-Application-Schema-Migration abgeschlossen');
}
