import { prisma } from '../../../src/config/database';
import { v4 as uuidv4 } from 'uuid';

export type PaymentSessionStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';

export interface PaymentSessionRow {
  id: string;
  resource_type: string;
  resource_id: string;
  provider_id: string;
  external_session_id: string | null;
  amount_cents: number;
  currency: string;
  status: PaymentSessionStatus;
  released_to_kitchen: boolean;
  paid_at: Date | null;
}

export const paymentRepository = {
  async createSession(data: {
    resourceType: string;
    resourceId: string;
    providerId: string;
    amountCents: number;
    currency: string;
    externalSessionId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const id = uuidv4();
    await prisma.$executeRaw`
      INSERT INTO payment_sessions (id, resource_type, resource_id, provider_id, external_session_id, amount_cents, currency, status, metadata)
      VALUES (${id}::uuid, ${data.resourceType}, ${data.resourceId}, ${data.providerId}, ${data.externalSessionId ?? null}, ${data.amountCents}, ${data.currency}, 'pending', ${JSON.stringify(data.metadata ?? {})}::jsonb)
    `;
    return id;
  },

  async updateSession(id: string, data: Partial<{
    status: PaymentSessionStatus;
    externalSessionId: string;
    releasedToKitchen: boolean;
    paidAt: Date;
  }>): Promise<void> {
    if (data.status) {
      await prisma.$executeRaw`UPDATE payment_sessions SET status = ${data.status}, updated_at = NOW() WHERE id = ${id}::uuid`;
    }
    if (data.externalSessionId) {
      await prisma.$executeRaw`UPDATE payment_sessions SET external_session_id = ${data.externalSessionId}, updated_at = NOW() WHERE id = ${id}::uuid`;
    }
    if (data.releasedToKitchen !== undefined) {
      await prisma.$executeRaw`UPDATE payment_sessions SET released_to_kitchen = ${data.releasedToKitchen}, updated_at = NOW() WHERE id = ${id}::uuid`;
    }
    if (data.paidAt) {
      await prisma.$executeRaw`UPDATE payment_sessions SET paid_at = ${data.paidAt}, updated_at = NOW() WHERE id = ${id}::uuid`;
    }
  },

  async findByExternalSessionId(externalId: string): Promise<PaymentSessionRow | null> {
    const rows = await prisma.$queryRaw<PaymentSessionRow[]>`
      SELECT id, resource_type, resource_id, provider_id, external_session_id, amount_cents, currency, status, released_to_kitchen, paid_at
      FROM payment_sessions WHERE external_session_id = ${externalId} LIMIT 1
    `;
    return rows[0] ?? null;
  },

  async findByResource(resourceType: string, resourceId: string): Promise<PaymentSessionRow | null> {
    const rows = await prisma.$queryRaw<PaymentSessionRow[]>`
      SELECT id, resource_type, resource_id, provider_id, external_session_id, amount_cents, currency, status, released_to_kitchen, paid_at
      FROM payment_sessions WHERE resource_type = ${resourceType} AND resource_id = ${resourceId}
      ORDER BY created_at DESC LIMIT 1
    `;
    return rows[0] ?? null;
  },

  async getReleasedResourceIds(resourceType: string, ids: string[]): Promise<string[]> {
    const released: string[] = [];
    for (const id of ids) {
      const session = await this.findByResource(resourceType, id);
      if (!session || session.status !== 'pending' || session.released_to_kitchen) {
        released.push(id);
      }
    }
    return released;
  },

  async createTransaction(data: {
    sessionId: string;
    externalTransactionId?: string;
    type: string;
    status: string;
    amountCents?: number;
  }): Promise<void> {
    await prisma.$executeRaw`
      INSERT INTO payment_transactions (id, session_id, external_transaction_id, type, status, amount_cents)
      VALUES (${uuidv4()}::uuid, ${data.sessionId}::uuid, ${data.externalTransactionId ?? null}, ${data.type}, ${data.status}, ${data.amountCents ?? null})
    `;
  },
};
