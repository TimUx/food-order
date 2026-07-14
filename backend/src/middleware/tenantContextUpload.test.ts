import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { ensureTenantContextAfterMultipart } from './tenantContextUpload';
import { TenantContext } from '../platform/tenant/TenantContext';
import { TenantContextMissingError } from '../platform/tenant/errors';

const tenantData = {
  id: 'tenant-1',
  name: 'Testverein',
  slug: 'test',
  subdomain: 'test',
  settings: {},
} as const;

vi.mock('../platform/bootstrap', () => ({
  tenantContext: new TenantContext(),
  tenantResolver: {
    resolve: vi.fn(),
  },
  tenantService: {
    findById: vi.fn(),
    resolveContextData: vi.fn(async (tenant: { id: string }) => ({
      ...tenantData,
      id: tenant.id,
    })),
  },
}));

import { tenantContext, tenantResolver, tenantService } from '../platform/bootstrap';

describe('ensureTenantContextAfterMultipart', () => {
  const next = vi.fn() as NextFunction;
  const res = {} as Response;

  beforeEach(() => {
    next.mockReset();
    tenantContext.clear();
    vi.mocked(tenantResolver.resolve).mockReset();
    vi.mocked(tenantService.findById).mockReset();
  });

  it('continues when tenant context is already present', async () => {
    tenantContext.run(tenantData, async () => {
      await ensureTenantContextAfterMultipart({} as Request, res, next);
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('rebinds tenant context from resolver after multipart parsing', async () => {
    vi.mocked(tenantResolver.resolve).mockResolvedValue({
      type: 'tenant',
      tenant: tenantData,
    } as never);

    await ensureTenantContextAfterMultipart({ headers: {} } as Request, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(tenantResolver.resolve).toHaveBeenCalled();
  });

  it('falls back to JWT tenant id when resolver has no tenant context', async () => {
    vi.mocked(tenantResolver.resolve).mockResolvedValue({ type: 'platform' } as never);
    vi.mocked(tenantService.findById).mockResolvedValue({ id: 'tenant-jwt' } as never);

    await ensureTenantContextAfterMultipart({
      headers: {},
      user: { tenantId: 'tenant-jwt' },
    } as Request, res, next);

    expect(tenantService.findById).toHaveBeenCalledWith('tenant-jwt');
    expect(next).toHaveBeenCalledWith();
  });

  it('returns TenantContextMissingError when context cannot be restored', async () => {
    vi.mocked(tenantResolver.resolve).mockResolvedValue({ type: 'platform' } as never);

    await ensureTenantContextAfterMultipart({ headers: {} } as Request, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(TenantContextMissingError));
  });
});
