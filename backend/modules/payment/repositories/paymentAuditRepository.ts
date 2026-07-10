import { prisma } from '../../../src/config/database';
import { v4 as uuidv4 } from 'uuid';
import { requireTenantId } from '../../../src/platform/tenant/tenantScope';
import type { PaymentAuditAction } from '../types';

export const paymentAuditRepository = {
  async log(data: {
    paymentId?: string;
    action: PaymentAuditAction;
    providerId?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    const tenantId = requireTenantId();
    await prisma.$executeRaw`
      INSERT INTO payment_audit (id, tenant_id, payment_id, action, provider_id, details)
      VALUES (
        ${uuidv4()}::uuid,
        ${tenantId},
        ${data.paymentId ?? null}::uuid,
        ${data.action},
        ${data.providerId ?? null},
        ${JSON.stringify(data.details ?? {})}::jsonb
      )
    `;
  },
};
