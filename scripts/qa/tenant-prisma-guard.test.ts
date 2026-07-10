import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { scanContent, scanProject } from './tenant-prisma-guard';

const FIXTURE = `
import { prisma } from '../config/database';

export async function crossTenantLeak() {
  return prisma.order.findMany({ where: { status: 'NEW' } });
}
`;

describe('tenant-prisma-guard', () => {
  it('flags unscoped prisma access in negative fixture', () => {
    const violations = scanContent('backend/src/services/evilFixture.ts', FIXTURE);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].model).toBe('order');
  });

  it('allows repository layer', () => {
    const content = `
      import { tenantWhere } from '../platform/tenant/tenantScope';
      prisma.order.findMany({ where: tenantWhere() });
    `;
    const violations = scanContent('backend/src/repositories/index.ts', content);
    expect(violations).toHaveLength(0);
  });

  it('requires tenant scope markers in scoped services', () => {
    const content = `export const x = () => prisma.order.findMany();`;
    const violations = scanContent('backend/src/services/realtimeSyncService.ts', content);
    expect(violations.some((v) => v.reason.includes('Scoped service'))).toBe(true);
  });

  it('passes on production codebase', () => {
    const violations = scanProject();
    if (violations.length > 0) {
      const msg = violations
        .map((v) => `${v.file}:${v.line} prisma.${v.model} – ${v.reason}`)
        .join('\n');
      expect.fail(`Unexpected tenant guard violations:\n${msg}`);
    }
    expect(violations).toHaveLength(0);
  });
});

describe('tenant-prisma-guard fixture file', () => {
  it('negative fixture on disk must be detected when scanned', () => {
    const fixturePath = path.join(import.meta.dirname, 'fixtures/tenant-guard-violation.ts');
    const violations = scanProject([fixturePath]);
    expect(violations.length).toBeGreaterThan(0);
  });
});
