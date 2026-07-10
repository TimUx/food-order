/**
 * CI negative fixture – this file MUST trigger tenant-prisma-guard violations.
 * Do not import in production code. Scanned only by tenant-prisma-guard.test.ts.
 */
import { prisma } from '../../../backend/src/config/database';

export async function intentionalCrossTenantViolation(): Promise<unknown> {
  return prisma.order.findMany({ where: { status: 'NEW' } });
}
