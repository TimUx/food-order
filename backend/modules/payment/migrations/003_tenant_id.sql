-- Payment module migration 003: tenant-scoped payment tables
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS payments_tenant_id_idx ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS payments_tenant_id_status_idx ON payments(tenant_id, status);

ALTER TABLE payment_provider_config ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE payment_provider_config DROP CONSTRAINT IF EXISTS payment_provider_config_pkey;
ALTER TABLE payment_provider_config ADD PRIMARY KEY (tenant_id, provider_id);
