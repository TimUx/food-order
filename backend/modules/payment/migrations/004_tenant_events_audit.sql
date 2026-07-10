-- Payment module migration 004: tenant-scoped events and audit
ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS payment_events_tenant_id_idx ON payment_events(tenant_id);
DROP INDEX IF EXISTS idx_payment_events_external;
CREATE UNIQUE INDEX IF NOT EXISTS payment_events_tenant_external_key
  ON payment_events(tenant_id, external_event_id) WHERE external_event_id IS NOT NULL;

ALTER TABLE payment_audit ADD COLUMN IF NOT EXISTS tenant_id TEXT;
CREATE INDEX IF NOT EXISTS payment_audit_tenant_id_idx ON payment_audit(tenant_id);
