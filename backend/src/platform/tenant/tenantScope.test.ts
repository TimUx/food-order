import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantContextMissingError } from './errors';

vi.mock('./sharedTenantContext', () => ({
  sharedTenantContext: {
    id: vi.fn(),
  },
}));

import { sharedTenantContext } from './sharedTenantContext';
import {
  assertTenantOwnership,
  optionalTenantId,
  requireTenantId,
  tenantWhere,
  withTenantId,
} from './tenantScope';

describe('tenantScope', () => {
  beforeEach(() => {
    vi.mocked(sharedTenantContext.id).mockReset();
  });

  it('requireTenantId returns current tenant id', () => {
    vi.mocked(sharedTenantContext.id).mockReturnValue('tenant-a');
    expect(requireTenantId()).toBe('tenant-a');
  });

  it('requireTenantId throws when context is missing', () => {
    vi.mocked(sharedTenantContext.id).mockReturnValue(undefined);
    expect(() => requireTenantId()).toThrow(TenantContextMissingError);
  });

  it('tenantWhere merges tenantId into filter', () => {
    vi.mocked(sharedTenantContext.id).mockReturnValue('tenant-a');
    expect(tenantWhere({ status: 'ACTIVE' })).toEqual({
      status: 'ACTIVE',
      tenantId: 'tenant-a',
    });
  });

  it('withTenantId merges tenantId into create data', () => {
    vi.mocked(sharedTenantContext.id).mockReturnValue('tenant-a');
    expect(withTenantId({ name: 'Test' })).toEqual({
      name: 'Test',
      tenantId: 'tenant-a',
    });
  });

  it('optionalTenantId returns undefined without context', () => {
    vi.mocked(sharedTenantContext.id).mockReturnValue(undefined);
    expect(optionalTenantId()).toBeUndefined();
  });

  it('assertTenantOwnership passes for matching tenant', () => {
    vi.mocked(sharedTenantContext.id).mockReturnValue('tenant-a');
    expect(() => assertTenantOwnership('tenant-a')).not.toThrow();
  });

  it('assertTenantOwnership throws for foreign tenant', () => {
    vi.mocked(sharedTenantContext.id).mockReturnValue('tenant-a');
    expect(() => assertTenantOwnership('tenant-b')).toThrow(TenantContextMissingError);
  });
});
