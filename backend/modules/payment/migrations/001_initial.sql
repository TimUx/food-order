-- Payment module migration 001
CREATE TABLE IF NOT EXISTS payment_sessions (
  id UUID PRIMARY KEY,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(64) NOT NULL,
  provider_id VARCHAR(50) NOT NULL,
  external_session_id VARCHAR(255),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  released_to_kitchen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_payment_sessions_resource ON payment_sessions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status ON payment_sessions(status);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES payment_sessions(id) ON DELETE CASCADE,
  external_transaction_id VARCHAR(255),
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  amount_cents INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_session ON payment_transactions(session_id);
