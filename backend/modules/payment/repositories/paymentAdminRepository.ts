import { prisma } from '../../../src/config/database';
import { requireTenantId } from '../../../src/platform/tenant/tenantScope';
import type { PaymentStatus } from '../types';
import { resolvePaymentStatus } from '../types';
import type { PaymentRow } from './paymentRepository';

export interface PaymentListRow extends PaymentRow {
  order_number?: number | null;
  event_id?: string | null;
  customer_name?: string | null;
}

export interface PaymentListFilter {
  dateFrom?: Date;
  dateTo?: Date;
  status?: PaymentStatus;
  providerId?: string;
  eventId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaymentAuditRow {
  id: string;
  payment_id: string | null;
  action: string;
  provider_id: string | null;
  details: Record<string, unknown> | null;
  created_at: Date;
}

export interface PaymentEventRow {
  id: string;
  payment_id: string | null;
  event_type: string;
  external_event_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: Date;
}

export interface PaymentTransactionRow {
  id: string;
  payment_id: string;
  provider: string | null;
  provider_reference: string | null;
  type: string;
  status: string;
  amount_cents: number | null;
  paid_at: Date | null;
  refunded_at: Date | null;
  created_at: Date;
}

export const paymentAdminRepository = {
  async listPayments(filter: PaymentListFilter): Promise<{ items: PaymentListRow[]; total: number }> {
    const tenantId = requireTenantId();
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 25, 100);
    const offset = (page - 1) * limit;
    const providerId = filter.providerId ?? null;
    const eventId = filter.eventId ?? null;

    const rows = await prisma.$queryRaw<PaymentListRow[]>`
      SELECT p.id, p.resource_type, p.resource_id, p.provider_id, p.external_session_id,
             p.amount_cents, p.currency, p.status, p.payment_status, p.released_to_kitchen,
             p.paid_at, p.expires_at, p.payment_reference, p.checkout_reference, p.metadata,
             p.created_at, p.updated_at,
             o."orderNumber" as order_number, o."eventId" as event_id,
             CASE WHEN c."firstName" IS NOT NULL
               THEN CONCAT(c."firstName", ' ', c."lastName")
               ELSE NULL END as customer_name
      FROM payments p
      LEFT JOIN "Order" o ON p.resource_type = 'order' AND p.resource_id = o.id::text
      LEFT JOIN "Customer" c ON o."customerId" = c.id
      WHERE p.tenant_id = ${tenantId}
        AND (${providerId}::text IS NULL OR p.provider_id = ${providerId})
        AND (${eventId}::text IS NULL OR o."eventId" = ${eventId})
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countRows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count
      FROM payments p
      LEFT JOIN "Order" o ON p.resource_type = 'order' AND p.resource_id = o.id::text
      WHERE p.tenant_id = ${tenantId}
        AND (${providerId}::text IS NULL OR p.provider_id = ${providerId})
        AND (${eventId}::text IS NULL OR o."eventId" = ${eventId})
    `;
    const total = Number(countRows[0]?.count ?? 0);

    let items = rows.map((r) => ({
      ...r,
      payment_status: resolvePaymentStatus(r) as string | null,
    })) as PaymentListRow[];

    if (filter.status) {
      items = items.filter((r) => resolvePaymentStatus(r) === filter.status);
    }

    return { items, total: filter.status ? items.length : total };
  },

  async getDashboardStats(): Promise<{
    todayCount: number;
    todayRevenueCents: number;
    openCount: number;
    failedCount: number;
    timeoutCount: number;
    refundCount: number;
  }> {
    const tenantId = requireTenantId();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const today = await prisma.$queryRaw<{ count: bigint; revenue: bigint | null }[]>`
      SELECT
        COUNT(*) FILTER (
          WHERE payment_status IN ('PAYMENT_PAID', 'ORDER_CONFIRMED') OR status = 'completed'
        )::bigint as count,
        COALESCE(SUM(amount_cents) FILTER (
          WHERE payment_status IN ('PAYMENT_PAID', 'ORDER_CONFIRMED') OR status = 'completed'
        ), 0)::bigint as revenue
      FROM payments WHERE tenant_id = ${tenantId} AND created_at >= ${todayStart}
    `;

    const open = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM payments
      WHERE tenant_id = ${tenantId}
        AND (payment_status IN ('CREATED', 'PAYMENT_PENDING', 'PAYMENT_PROCESSING')
        OR (payment_status IS NULL AND status = 'pending'))
    `;

    const failed = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM payments
      WHERE tenant_id = ${tenantId}
        AND (payment_status = 'PAYMENT_FAILED' OR status = 'failed')
    `;

    const timeout = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM payments
      WHERE tenant_id = ${tenantId} AND payment_status = 'PAYMENT_TIMEOUT'
    `;

    const refunds = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM payment_audit pa
      INNER JOIN payments p ON pa.payment_id = p.id
      WHERE p.tenant_id = ${tenantId} AND pa.action = 'refund'
    `;

    return {
      todayCount: Number(today[0]?.count ?? 0),
      todayRevenueCents: Number(today[0]?.revenue ?? 0),
      openCount: Number(open[0]?.count ?? 0),
      failedCount: Number(failed[0]?.count ?? 0),
      timeoutCount: Number(timeout[0]?.count ?? 0),
      refundCount: Number(refunds[0]?.count ?? 0),
    };
  },

  async getStatistics(period: 'today' | 'week' | 'month'): Promise<{
    totalCount: number;
    successCount: number;
    failedCount: number;
    revenueCents: number;
    refundCount: number;
    byProvider: { providerId: string; count: number; revenueCents: number }[];
  }> {
    const tenantId = requireTenantId();
    const since = new Date();
    if (period === 'today') since.setHours(0, 0, 0, 0);
    else if (period === 'week') since.setDate(since.getDate() - 7);
    else since.setMonth(since.getMonth() - 1);

    const totals = await prisma.$queryRaw<{ total: bigint; success: bigint; failed: bigint; revenue: bigint }[]>`
      SELECT
        COUNT(*)::bigint as total,
        COUNT(*) FILTER (WHERE payment_status IN ('PAYMENT_PAID', 'ORDER_CONFIRMED') OR status = 'completed')::bigint as success,
        COUNT(*) FILTER (WHERE payment_status IN ('PAYMENT_FAILED', 'PAYMENT_CANCELLED', 'PAYMENT_TIMEOUT') OR status IN ('failed', 'cancelled'))::bigint as failed,
        COALESCE(SUM(amount_cents) FILTER (WHERE payment_status IN ('PAYMENT_PAID', 'ORDER_CONFIRMED') OR status = 'completed'), 0)::bigint as revenue
      FROM payments WHERE tenant_id = ${tenantId} AND created_at >= ${since}
    `;

    const byProvider = await prisma.$queryRaw<{ provider_id: string; count: bigint; revenue: bigint }[]>`
      SELECT provider_id, COUNT(*)::bigint as count,
             COALESCE(SUM(amount_cents), 0)::bigint as revenue
      FROM payments WHERE tenant_id = ${tenantId} AND created_at >= ${since}
      GROUP BY provider_id ORDER BY count DESC
    `;

    const refundCount = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM payment_audit pa
      INNER JOIN payments p ON pa.payment_id = p.id
      WHERE p.tenant_id = ${tenantId} AND pa.action = 'refund' AND pa.created_at >= ${since}
    `;

    const t = totals[0];
    return {
      totalCount: Number(t?.total ?? 0),
      successCount: Number(t?.success ?? 0),
      failedCount: Number(t?.failed ?? 0),
      revenueCents: Number(t?.revenue ?? 0),
      refundCount: Number(refundCount[0]?.count ?? 0),
      byProvider: byProvider.map((p) => ({
        providerId: p.provider_id,
        count: Number(p.count),
        revenueCents: Number(p.revenue),
      })),
    };
  },

  async listAudits(filter: { page?: number; limit?: number; providerId?: string; action?: string }): Promise<{
    items: PaymentAuditRow[];
    total: number;
  }> {
    const tenantId = requireTenantId();
    const limit = Math.min(filter.limit ?? 50, 200);
    const offset = ((filter.page ?? 1) - 1) * limit;

    const items = filter.action
      ? filter.providerId
        ? await prisma.$queryRaw<PaymentAuditRow[]>`
            SELECT pa.id, pa.payment_id, pa.action, pa.provider_id, pa.details, pa.created_at
            FROM payment_audit pa
            INNER JOIN payments p ON pa.payment_id = p.id AND p.tenant_id = ${tenantId}
            WHERE pa.action = ${filter.action} AND pa.provider_id = ${filter.providerId}
            ORDER BY pa.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `
        : await prisma.$queryRaw<PaymentAuditRow[]>`
            SELECT pa.id, pa.payment_id, pa.action, pa.provider_id, pa.details, pa.created_at
            FROM payment_audit pa
            INNER JOIN payments p ON pa.payment_id = p.id AND p.tenant_id = ${tenantId}
            WHERE pa.action = ${filter.action}
            ORDER BY pa.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `
      : filter.providerId
        ? await prisma.$queryRaw<PaymentAuditRow[]>`
            SELECT pa.id, pa.payment_id, pa.action, pa.provider_id, pa.details, pa.created_at
            FROM payment_audit pa
            INNER JOIN payments p ON pa.payment_id = p.id AND p.tenant_id = ${tenantId}
            WHERE pa.provider_id = ${filter.providerId}
            ORDER BY pa.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `
        : await prisma.$queryRaw<PaymentAuditRow[]>`
            SELECT pa.id, pa.payment_id, pa.action, pa.provider_id, pa.details, pa.created_at
            FROM payment_audit pa
            INNER JOIN payments p ON pa.payment_id = p.id AND p.tenant_id = ${tenantId}
            ORDER BY pa.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `;

    const countRows = filter.action
      ? filter.providerId
        ? await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*)::bigint as count FROM payment_audit pa
            INNER JOIN payments p ON pa.payment_id = p.id AND p.tenant_id = ${tenantId}
            WHERE pa.action = ${filter.action} AND pa.provider_id = ${filter.providerId}
          `
        : await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*)::bigint as count FROM payment_audit pa
            INNER JOIN payments p ON pa.payment_id = p.id AND p.tenant_id = ${tenantId}
            WHERE pa.action = ${filter.action}
          `
      : filter.providerId
        ? await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*)::bigint as count FROM payment_audit pa
            INNER JOIN payments p ON pa.payment_id = p.id AND p.tenant_id = ${tenantId}
            WHERE pa.provider_id = ${filter.providerId}
          `
        : await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*)::bigint as count FROM payment_audit pa
            INNER JOIN payments p ON pa.payment_id = p.id AND p.tenant_id = ${tenantId}
          `;

    return { items, total: Number(countRows[0]?.count ?? 0) };
  },

  async listWebhookEvents(filter: { page?: number; limit?: number }): Promise<{
    items: PaymentEventRow[];
    total: number;
  }> {
    const tenantId = requireTenantId();
    const limit = Math.min(filter.limit ?? 50, 200);
    const offset = ((filter.page ?? 1) - 1) * limit;

    const items = await prisma.$queryRaw<PaymentEventRow[]>`
      SELECT pe.id, pe.payment_id, pe.event_type, pe.external_event_id, pe.payload, pe.created_at
      FROM payment_events pe
      INNER JOIN payments p ON pe.payment_id = p.id AND p.tenant_id = ${tenantId}
      ORDER BY pe.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countRows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM payment_events pe
      INNER JOIN payments p ON pe.payment_id = p.id AND p.tenant_id = ${tenantId}
    `;

    return { items, total: Number(countRows[0]?.count ?? 0) };
  },

  async getTransactionsForPayment(paymentId: string): Promise<PaymentTransactionRow[]> {
    const tenantId = requireTenantId();
    return prisma.$queryRaw<PaymentTransactionRow[]>`
      SELECT pt.id, pt.payment_id, pt.provider, pt.provider_reference, pt.type, pt.status,
             pt.amount_cents, pt.paid_at, pt.refunded_at, pt.created_at
      FROM payment_transactions pt
      INNER JOIN payments p ON pt.payment_id = p.id AND p.tenant_id = ${tenantId}
      WHERE pt.payment_id = ${paymentId}::uuid
      ORDER BY pt.created_at DESC
    `;
  },

  async getAuditsForPayment(paymentId: string): Promise<PaymentAuditRow[]> {
    const tenantId = requireTenantId();
    return prisma.$queryRaw<PaymentAuditRow[]>`
      SELECT pa.id, pa.payment_id, pa.action, pa.provider_id, pa.details, pa.created_at
      FROM payment_audit pa
      INNER JOIN payments p ON pa.payment_id = p.id AND p.tenant_id = ${tenantId}
      WHERE pa.payment_id = ${paymentId}::uuid
      ORDER BY pa.created_at ASC
    `;
  },
};
