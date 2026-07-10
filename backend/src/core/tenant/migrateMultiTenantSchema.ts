import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000010';

const MIGRATION_MARKER = 'multi_tenant_schema_v1';

type MigrationStep = {
  name: string;
  sql: string;
};

async function markMigrationComplete(defaultTenantId: string): Promise<void> {
  await migrateUploadFiles(defaultTenantId);
  await prisma.$executeRaw`
    INSERT INTO platform_settings (key, value, encrypted, updated_at)
    VALUES (${MIGRATION_MARKER}, ${JSON.stringify({ appliedAt: new Date().toISOString(), tenantId: defaultTenantId })}::jsonb, false, NOW())
    ON CONFLICT (key) DO NOTHING
  `;
  logger.info('Multi-Tenant-Schema-Migration abgeschlossen', { tenant_id: defaultTenantId });
}

/**
 * Idempotente Schema-Migration für Multi-Tenant (Phase 2).
 * Wird beim App-Start ausgeführt, nachdem der Standard-Mandant existiert.
 */
export async function migrateMultiTenantSchema(defaultTenantId: string): Promise<void> {
  const marker = await prisma.$queryRaw<{ key: string }[]>`
    SELECT key FROM platform_settings WHERE key = ${MIGRATION_MARKER} LIMIT 1
  `.catch(() => [] as { key: string }[]);

  if (marker.length > 0) {
    logger.info('Multi-Tenant-Schema-Migration bereits angewendet', { tenant_id: defaultTenantId });
    return;
  }

  const tenantColumn = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'tenant_id'
    ) AS exists
  `.catch(() => [{ exists: false }]);

  if (tenantColumn[0]?.exists) {
    logger.info('Multi-Tenant-Schema bereits via Prisma synchronisiert — Marker setzen', {
      tenant_id: defaultTenantId,
    });
    await markMigrationComplete(defaultTenantId);
    return;
  }

  logger.info('Starte Multi-Tenant-Schema-Migration', { tenant_id: defaultTenantId });

  const steps: MigrationStep[] = [
    {
      name: 'users.tenant_id',
      sql: `
        ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
        UPDATE "User" SET "tenant_id" = '${defaultTenantId}' WHERE "tenant_id" IS NULL;
        ALTER TABLE "User" ALTER COLUMN "tenant_id" SET NOT NULL;
        CREATE INDEX IF NOT EXISTS "User_tenant_id_idx" ON "User"("tenant_id");
        CREATE INDEX IF NOT EXISTS "User_tenant_id_email_idx" ON "User"("tenant_id", "email");
        ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_key";
        CREATE UNIQUE INDEX IF NOT EXISTS "User_tenant_id_email_key" ON "User"("tenant_id", "email");
        DO $$ BEGIN
          ALTER TABLE "User" ADD CONSTRAINT "User_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      `,
    },
    {
      name: 'Event.tenant_id',
      sql: `
        ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
        UPDATE "Event" SET "tenant_id" = '${defaultTenantId}' WHERE "tenant_id" IS NULL;
        ALTER TABLE "Event" ALTER COLUMN "tenant_id" SET NOT NULL;
        CREATE INDEX IF NOT EXISTS "Event_tenant_id_idx" ON "Event"("tenant_id");
        CREATE INDEX IF NOT EXISTS "Event_tenant_id_isActive_idx" ON "Event"("tenant_id", "isActive");
        CREATE INDEX IF NOT EXISTS "Event_tenant_id_createdAt_idx" ON "Event"("tenant_id", "createdAt");
        DO $$ BEGIN
          ALTER TABLE "Event" ADD CONSTRAINT "Event_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      `,
    },
    {
      name: 'Customer.tenant_id',
      sql: `
        ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
        UPDATE "Customer" SET "tenant_id" = '${defaultTenantId}' WHERE "tenant_id" IS NULL;
        ALTER TABLE "Customer" ALTER COLUMN "tenant_id" SET NOT NULL;
        CREATE INDEX IF NOT EXISTS "Customer_tenant_id_idx" ON "Customer"("tenant_id");
        DO $$ BEGIN
          ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      `,
    },
    {
      name: 'FoodItem.tenant_id',
      sql: `
        ALTER TABLE "FoodItem" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
        UPDATE "FoodItem" fi SET "tenant_id" = e."tenant_id"
        FROM "Event" e WHERE fi."eventId" = e."id" AND fi."tenant_id" IS NULL;
        UPDATE "FoodItem" SET "tenant_id" = '${defaultTenantId}' WHERE "tenant_id" IS NULL;
        ALTER TABLE "FoodItem" ALTER COLUMN "tenant_id" SET NOT NULL;
        CREATE INDEX IF NOT EXISTS "FoodItem_tenant_id_idx" ON "FoodItem"("tenant_id");
        CREATE INDEX IF NOT EXISTS "FoodItem_tenant_id_eventId_idx" ON "FoodItem"("tenant_id", "eventId");
        DO $$ BEGIN
          ALTER TABLE "FoodItem" ADD CONSTRAINT "FoodItem_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      `,
    },
    {
      name: 'Order.tenant_id',
      sql: `
        ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
        UPDATE "Order" o SET "tenant_id" = e."tenant_id"
        FROM "Event" e WHERE o."eventId" = e."id" AND o."tenant_id" IS NULL;
        UPDATE "Order" SET "tenant_id" = '${defaultTenantId}' WHERE "tenant_id" IS NULL;
        ALTER TABLE "Order" ALTER COLUMN "tenant_id" SET NOT NULL;
        CREATE INDEX IF NOT EXISTS "Order_tenant_id_idx" ON "Order"("tenant_id");
        CREATE INDEX IF NOT EXISTS "Order_tenant_id_status_idx" ON "Order"("tenant_id", "status");
        CREATE INDEX IF NOT EXISTS "Order_tenant_id_eventId_idx" ON "Order"("tenant_id", "eventId");
        CREATE INDEX IF NOT EXISTS "Order_tenant_id_createdAt_idx" ON "Order"("tenant_id", "createdAt");
        DO $$ BEGIN
          ALTER TABLE "Order" ADD CONSTRAINT "Order_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      `,
    },
    {
      name: 'DailyOrderCounter.tenant_id',
      sql: `
        ALTER TABLE "DailyOrderCounter" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
        UPDATE "DailyOrderCounter" c SET "tenant_id" = e."tenant_id"
        FROM "Event" e WHERE c."eventId" = e."id" AND c."tenant_id" IS NULL;
        UPDATE "DailyOrderCounter" SET "tenant_id" = '${defaultTenantId}' WHERE "tenant_id" IS NULL;
        ALTER TABLE "DailyOrderCounter" ALTER COLUMN "tenant_id" SET NOT NULL;
        CREATE INDEX IF NOT EXISTS "DailyOrderCounter_tenant_id_idx" ON "DailyOrderCounter"("tenant_id");
        DO $$ BEGIN
          ALTER TABLE "DailyOrderCounter" ADD CONSTRAINT "DailyOrderCounter_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      `,
    },
    {
      name: 'legal_pages.tenant_id',
      sql: `
        ALTER TABLE legal_pages ADD COLUMN IF NOT EXISTS tenant_id TEXT;
        UPDATE legal_pages SET tenant_id = '${defaultTenantId}' WHERE tenant_id IS NULL;
        ALTER TABLE legal_pages ALTER COLUMN tenant_id SET NOT NULL;
        CREATE INDEX IF NOT EXISTS legal_pages_tenant_id_idx ON legal_pages(tenant_id);
        ALTER TABLE legal_pages DROP CONSTRAINT IF EXISTS legal_pages_page_type_key;
        ALTER TABLE legal_pages DROP CONSTRAINT IF EXISTS legal_pages_slug_key;
        CREATE UNIQUE INDEX IF NOT EXISTS legal_pages_tenant_page_type_key ON legal_pages(tenant_id, page_type);
        CREATE UNIQUE INDEX IF NOT EXISTS legal_pages_tenant_slug_key ON legal_pages(tenant_id, slug);
        DO $$ BEGIN
          ALTER TABLE legal_pages ADD CONSTRAINT legal_pages_tenant_id_fkey
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      `,
    },
    {
      name: 'modules.tenant_id',
      sql: `
        ALTER TABLE modules ADD COLUMN IF NOT EXISTS tenant_id TEXT;
        UPDATE modules SET tenant_id = '${defaultTenantId}' WHERE tenant_id IS NULL;
        ALTER TABLE modules ALTER COLUMN tenant_id SET NOT NULL;
        CREATE INDEX IF NOT EXISTS modules_tenant_id_idx ON modules(tenant_id);
        ALTER TABLE modules DROP CONSTRAINT IF EXISTS modules_pkey;
        CREATE UNIQUE INDEX IF NOT EXISTS modules_tenant_module_key ON modules(tenant_id, module_id);
        ALTER TABLE modules ADD PRIMARY KEY (tenant_id, module_id);
        DO $$ BEGIN
          ALTER TABLE modules ADD CONSTRAINT modules_tenant_id_fkey
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      `,
    },
    {
      name: 'module_migrations.tenant_id',
      sql: `
        ALTER TABLE module_migrations ADD COLUMN IF NOT EXISTS tenant_id TEXT;
        UPDATE module_migrations SET tenant_id = '${defaultTenantId}' WHERE tenant_id IS NULL;
        ALTER TABLE module_migrations ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE module_migrations DROP CONSTRAINT IF EXISTS module_migrations_pkey;
        ALTER TABLE module_migrations ADD PRIMARY KEY (tenant_id, module_id, migration);
        CREATE INDEX IF NOT EXISTS module_migrations_tenant_id_idx ON module_migrations(tenant_id);
        DO $$ BEGIN
          ALTER TABLE module_migrations ADD CONSTRAINT module_migrations_tenant_id_fkey
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      `,
    },
    {
      name: 'platform_audit_log.tenant_id',
      sql: `
        ALTER TABLE platform_audit_log ADD COLUMN IF NOT EXISTS tenant_id TEXT;
        CREATE INDEX IF NOT EXISTS platform_audit_log_tenant_id_idx ON platform_audit_log(tenant_id);
        CREATE INDEX IF NOT EXISTS platform_audit_log_tenant_id_created_at_idx ON platform_audit_log(tenant_id, created_at);
      `,
    },
    {
      name: 'payment.tenant_id',
      sql: `
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_id TEXT;
        UPDATE payments SET tenant_id = '${defaultTenantId}' WHERE tenant_id IS NULL;
        ALTER TABLE payments ALTER COLUMN tenant_id SET NOT NULL;
        CREATE INDEX IF NOT EXISTS payments_tenant_id_idx ON payments(tenant_id);
        CREATE INDEX IF NOT EXISTS payments_tenant_id_status_idx ON payments(tenant_id, status);
        DO $$ BEGIN
          ALTER TABLE payments ADD CONSTRAINT payments_tenant_id_fkey
            FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

        ALTER TABLE payment_provider_config ADD COLUMN IF NOT EXISTS tenant_id TEXT;
        UPDATE payment_provider_config SET tenant_id = '${defaultTenantId}' WHERE tenant_id IS NULL;
        ALTER TABLE payment_provider_config ALTER COLUMN tenant_id SET NOT NULL;
        ALTER TABLE payment_provider_config DROP CONSTRAINT IF EXISTS payment_provider_config_pkey;
        ALTER TABLE payment_provider_config ADD PRIMARY KEY (tenant_id, provider_id);
      `,
    },
    {
      name: 'ClubSettings.tenant_id',
      sql: `
        ALTER TABLE "ClubSettings" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
        UPDATE "ClubSettings" SET "tenant_id" = '${defaultTenantId}' WHERE "tenant_id" IS NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS "ClubSettings_tenant_id_key" ON "ClubSettings"("tenant_id");
      `,
    },
  ];

  for (const step of steps) {
    try {
      await prisma.$executeRawUnsafe(step.sql);
      logger.info(`Migrationsschritt abgeschlossen: ${step.name}`, { tenant_id: defaultTenantId });
    } catch (error) {
      logger.error(`Migrationsschritt fehlgeschlagen: ${step.name}`, error, defaultTenantId);
      throw error;
    }
  }

  await markMigrationComplete(defaultTenantId);
}

async function migrateUploadFiles(defaultTenantId: string): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');
  const { config } = await import('../../config');

  const uploadRoot = path.resolve(config.uploadsDir);
  const tenantDir = path.join(uploadRoot, defaultTenantId);

  if (!fs.existsSync(uploadRoot)) {
    fs.mkdirSync(tenantDir, { recursive: true });
    return;
  }

  if (!fs.existsSync(tenantDir)) {
    fs.mkdirSync(tenantDir, { recursive: true });
  }

  const entries = fs.readdirSync(uploadRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const src = path.join(uploadRoot, entry.name);
    const dest = path.join(tenantDir, entry.name);
    if (!fs.existsSync(dest)) {
      fs.renameSync(src, dest);
      logger.info('Upload-Datei migriert', {
        tenant_id: defaultTenantId,
        file: entry.name,
      });
    }
  }
}
