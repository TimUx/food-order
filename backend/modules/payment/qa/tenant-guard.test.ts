import { describe, expect, it } from 'vitest';
import { ALLOWLIST_REPOSITORIES } from '../../../../scripts/qa/tenant-prisma-policy';

describe('tenant access policy (payment module)', () => {
  it('payment repositories are on tenant prisma allowlist', () => {
    const paymentRepos = [
      'backend/modules/payment/repositories/paymentRepository.ts',
      'backend/modules/payment/repositories/paymentAdminRepository.ts',
      'backend/modules/payment/repositories/paymentAuditRepository.ts',
    ];
    for (const repo of paymentRepos) {
      expect(ALLOWLIST_REPOSITORIES).toContain(repo);
    }
  });
});
