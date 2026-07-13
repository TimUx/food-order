import { prisma } from '../../../src/config/database';
import { v4 as uuidv4 } from 'uuid';
import { requireTenantId } from '../../../src/platform/tenant/tenantScope';
import type { PaymentStatus } from '../types';
import { legacyStatusToPaymentStatus, resolvePaymentStatus } from '../types';

export type PaymentSessionStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';

export interface PaymentRow {
  id: string;
  resource_type: string;
  resource_id: string;
  provider_id: string;
  external_session_id: string | null;
  amount_cents: number;
  currency: string;
  status: PaymentSessionStatus;
  payment_status: string | null;
  released_to_kitchen: boolean;
  paid_at: Date | null;
  expires_at: Date | null;
  payment_reference: string | null;
  checkout_reference: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

function rowToStatus(row: PaymentRow): PaymentStatus {
  return resolvePaymentStatus(row);
}

export const paymentRepository = {
  async createPayment(data: {
    resourceType: string;
    resourceId: string;
    providerId: string;
    amountCents: number;
    currency: string;
    externalSessionId?: string;
    expiresAt?: Date;
    paymentReference?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const id = uuidv4();
    const tenantId = requireTenantId();
    await prisma.$executeRaw`
      INSERT INTO payments (
        id, tenant_id, resource_type, resource_id, provider_id, external_session_id,
        amount_cents, currency, status, payment_status, expires_at,
        payment_reference, metadata
      )
      VALUES (
        ${id}::uuid, ${tenantId}, ${data.resourceType}, ${data.resourceId}, ${data.providerId},
        ${data.externalSessionId ?? null}, ${data.amountCents}, ${data.currency},
        'pending', 'CREATED', ${data.expiresAt ?? null},
        ${data.paymentReference ?? null}, ${JSON.stringify(data.metadata ?? {})}::jsonb
      )
    `;
    return id;
  },

  async createSession(data: {
    resourceType: string;
    resourceId: string;
    providerId: string;
    amountCents: number;
    currency: string;
    externalSessionId?: string;
    expiresAt?: Date;
    paymentReference?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    return this.createPayment(data);
  },

  async updatePayment(id: string, data: Partial<{
    status: PaymentSessionStatus;
    paymentStatus: PaymentStatus;
    externalSessionId: string;
    checkoutReference: string;
    paymentReference: string;
    releasedToKitchen: boolean;
    paidAt: Date;
    expiresAt: Date;
  }>): Promise<void> {
    const tenantId = requireTenantId();
    if (data.status) {
      await prisma.$executeRaw`UPDATE payments SET status = ${data.status}, updated_at = NOW() WHERE id = ${id}::uuid AND tenant_id = ${tenantId}`;
    }
    if (data.paymentStatus) {
      await prisma.$executeRaw`UPDATE payments SET payment_status = ${data.paymentStatus}, updated_at = NOW() WHERE id = ${id}::uuid AND tenant_id = ${tenantId}`;
    }
    if (data.externalSessionId) {
      await prisma.$executeRaw`UPDATE payments SET external_session_id = ${data.externalSessionId}, updated_at = NOW() WHERE id = ${id}::uuid AND tenant_id = ${tenantId}`;
    }
    if (data.checkoutReference) {
      await prisma.$executeRaw`UPDATE payments SET checkout_reference = ${data.checkoutReference}, updated_at = NOW() WHERE id = ${id}::uuid AND tenant_id = ${tenantId}`;
    }
    if (data.paymentReference) {
      await prisma.$executeRaw`UPDATE payments SET payment_reference = ${data.paymentReference}, updated_at = NOW() WHERE id = ${id}::uuid AND tenant_id = ${tenantId}`;
    }
    if (data.releasedToKitchen !== undefined) {
      await prisma.$executeRaw`UPDATE payments SET released_to_kitchen = ${data.releasedToKitchen}, updated_at = NOW() WHERE id = ${id}::uuid AND tenant_id = ${tenantId}`;
    }
    if (data.paidAt) {
      await prisma.$executeRaw`UPDATE payments SET paid_at = ${data.paidAt}, updated_at = NOW() WHERE id = ${id}::uuid AND tenant_id = ${tenantId}`;
    }
    if (data.expiresAt) {
      await prisma.$executeRaw`UPDATE payments SET expires_at = ${data.expiresAt}, updated_at = NOW() WHERE id = ${id}::uuid AND tenant_id = ${tenantId}`;
    }
  },

  async updateSession(id: string, data: Partial<{
    status: PaymentSessionStatus;
    paymentStatus: PaymentStatus;
    externalSessionId: string;
    checkoutReference: string;
    paymentReference: string;
    releasedToKitchen: boolean;
    paidAt: Date;
    expiresAt: Date;
  }>): Promise<void> {
    return this.updatePayment(id, data);
  },

  async findById(id: string): Promise<PaymentRow | null> {
    const tenantId = requireTenantId();
    const rows = await prisma.$queryRaw<PaymentRow[]>`
      SELECT id, resource_type, resource_id, provider_id, external_session_id,
             amount_cents, currency, status, payment_status, released_to_kitchen,
             paid_at, expires_at, payment_reference, checkout_reference, metadata,
             created_at, updated_at
      FROM payments WHERE id = ${id}::uuid AND tenant_id = ${tenantId} LIMIT 1
    `;
    return rows[0] ?? null;
  },

  async findByExternalSessionId(externalId: string): Promise<PaymentRow | null> {
    const tenantId = requireTenantId();
    const rows = await prisma.$queryRaw<PaymentRow[]>`
      SELECT id, resource_type, resource_id, provider_id, external_session_id,
             amount_cents, currency, status, payment_status, released_to_kitchen,
             paid_at, expires_at, payment_reference, checkout_reference, metadata,
             created_at, updated_at
      FROM payments WHERE external_session_id = ${externalId} AND tenant_id = ${tenantId} LIMIT 1
    `;
    return rows[0] ?? null;
  },

  async findByResource(resourceType: string, resourceId: string): Promise<PaymentRow | null> {
    const tenantId = requireTenantId();
    const rows = await prisma.$queryRaw<PaymentRow[]>`
      SELECT id, resource_type, resource_id, provider_id, external_session_id,
             amount_cents, currency, status, payment_status, released_to_kitchen,
             paid_at, expires_at, payment_reference, checkout_reference, metadata,
             created_at, updated_at
      FROM payments WHERE resource_type = ${resourceType} AND resource_id = ${resourceId}
        AND tenant_id = ${tenantId}
      ORDER BY created_at DESC LIMIT 1
    `;
    return rows[0] ?? null;
  },

  async findLatestByResources(
    resourceType: string,
    ids: string[]
  ): Promise<Map<string, Pick<PaymentRow, 'id' | 'resource_id' | 'status' | 'payment_status' | 'released_to_kitchen'>>> {
    if (ids.length === 0) return new Map();

    const tenantId = requireTenantId();
    const rows = await prisma.$queryRaw<
      Pick<PaymentRow, 'id' | 'resource_id' | 'status' | 'payment_status' | 'released_to_kitchen'>[]
    >`
      SELECT DISTINCT ON (resource_id) id, resource_id, status, payment_status, released_to_kitchen
      FROM payments
      WHERE resource_type = ${resourceType}
        AND resource_id = ANY(${ids})
        AND tenant_id = ${tenantId}
      ORDER BY resource_id, created_at DESC
    `;

    return new Map(rows.map((r) => [r.resource_id, r]));
  },

  async getReleasedResourceIds(resourceType: string, ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];

    const tenantId = requireTenantId();
    const rows = await prisma.$queryRaw<Pick<PaymentRow, 'resource_id' | 'status' | 'payment_status' | 'released_to_kitchen'>[]>`
      SELECT DISTINCT ON (resource_id) resource_id, status, payment_status, released_to_kitchen
      FROM payments
      WHERE resource_type = ${resourceType}
        AND resource_id = ANY(${ids})
        AND tenant_id = ${tenantId}
      ORDER BY resource_id, created_at DESC
    `;

    const sessionByResource = new Map(rows.map((r) => [r.resource_id, r]));
    return ids.filter((id) => {
      const session = sessionByResource.get(id);
      if (!session) return true;
      const ps = session.payment_status ?? legacyStatusToPaymentStatus(session.status);
      const pending = ps === 'CREATED' || ps === 'PAYMENT_PENDING' || ps === 'PAYMENT_PROCESSING';
      return !pending || session.released_to_kitchen;
    });
  },

  async markTimedOutIfPending(id: string): Promise<boolean> {
    const tenantId = requireTenantId();
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      UPDATE payments
      SET status = 'cancelled', payment_status = 'PAYMENT_TIMEOUT', updated_at = NOW()
      WHERE id = ${id}::uuid
        AND tenant_id = ${tenantId}
        AND (
          payment_status IN ('CREATED', 'PAYMENT_PENDING')
          OR (payment_status IS NULL AND status = 'pending')
        )
      RETURNING id
    `;
    return rows.length > 0;
  },

  async isExpired(row: PaymentRow): Promise<boolean> {
    if (!row.expires_at) return false;
    return row.expires_at.getTime() < Date.now();
  },

  resolveStatus(row: PaymentRow): PaymentStatus {
    return rowToStatus(row);
  },

  async hasWebhookEvent(externalEventId: string): Promise<boolean> {
    const tenantId = requireTenantId();
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM payment_events
      WHERE external_event_id = ${externalEventId} AND tenant_id = ${tenantId}
      LIMIT 1
    `;
    return rows.length > 0;
  },

  async recordWebhookEvent(data: {
    paymentId?: string;
    eventType: string;
    externalEventId: string;
    payload?: Record<string, unknown>;
  }): Promise<boolean> {
    const tenantId = requireTenantId();
    const id = uuidv4();
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO payment_events (id, tenant_id, payment_id, event_type, external_event_id, payload)
      VALUES (
        ${id}::uuid,
        ${tenantId},
        ${data.paymentId ?? null}::uuid,
        ${data.eventType},
        ${data.externalEventId},
        ${JSON.stringify(data.payload ?? {})}::jsonb
      )
      ON CONFLICT (tenant_id, external_event_id) WHERE external_event_id IS NOT NULL DO NOTHING
      RETURNING id
    `;
    return rows.length > 0;
  },

  async createTransaction(data: {
    paymentId: string;
    provider: string;
    providerReference?: string;
    checkoutReference?: string;
    type: string;
    status: string;
    amountCents?: number;
    currency?: string;
    paidAt?: Date;
    refundedAt?: Date;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const id = uuidv4();
    await prisma.$executeRaw`
      INSERT INTO payment_transactions (
        id, payment_id, external_transaction_id, provider, provider_reference,
        checkout_reference, type, status, amount_cents, currency, paid_at, refunded_at, metadata
      )
      VALUES (
        ${id}::uuid, ${data.paymentId}::uuid, ${data.providerReference ?? null},
        ${data.provider}, ${data.providerReference ?? null}, ${data.checkoutReference ?? null},
        ${data.type}, ${data.status}, ${data.amountCents ?? null},
        ${data.currency ?? 'EUR'}, ${data.paidAt ?? null}, ${data.refundedAt ?? null},
        ${JSON.stringify(data.metadata ?? {})}::jsonb
      )
    `;
    return id;
  },

  async upsertProviderConfig(data: {
    providerId: string;
    enabled: boolean;
    configValid: boolean;
    apiReachable?: boolean;
    webhookValid?: boolean;
    sandboxReachable?: boolean;
    details?: Record<string, unknown>;
  }): Promise<void> {
    const tenantId = requireTenantId();
    await prisma.$executeRaw`
      INSERT INTO payment_provider_config (
        tenant_id, provider_id, enabled, config_valid, api_reachable, webhook_valid,
        sandbox_reachable, last_checked_at, details
      )
      VALUES (
        ${tenantId}, ${data.providerId}, ${data.enabled}, ${data.configValid},
        ${data.apiReachable ?? null}, ${data.webhookValid ?? null},
        ${data.sandboxReachable ?? null}, NOW(),
        ${JSON.stringify(data.details ?? {})}::jsonb
      )
      ON CONFLICT (tenant_id, provider_id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        config_valid = EXCLUDED.config_valid,
        api_reachable = EXCLUDED.api_reachable,
        webhook_valid = EXCLUDED.webhook_valid,
        sandbox_reachable = EXCLUDED.sandbox_reachable,
        last_checked_at = NOW(),
        details = EXCLUDED.details
    `;
  },
};
