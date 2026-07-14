import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { TenantContextMissingError } from '../platform/tenant/errors';
import type { TenantContext } from '../platform/tenant/TenantContext';

const mocks = vi.hoisted(() => ({
  tenantData: {
    id: 'tenant-1',
    name: 'Testverein',
    slug: 'test',
    subdomain: 'test',
    settings: {},
  } as const,
  resolve: vi.fn(),
  findById: vi.fn(),
  resolveContextData: vi.fn(),
  tenantContext: undefined as TenantContext | undefined,
}));

vi.mock('../platform/bootstrap', async () => {
  const { TenantContext } = await import('../platform/tenant/TenantContext');
  mocks.tenantContext = new TenantContext();
  mocks.resolveContextData.mockImplementation(async (tenant: { id: string }) => ({
    ...mocks.tenantData,
    id: tenant.id,
  }));

  return {
    tenantContext: mocks.tenantContext,
    tenantResolver: { resolve: mocks.resolve },
    tenantService: {
      findById: mocks.findById,
      resolveContextData: mocks.resolveContextData,
    },
  };
});

import { ensureTenantContextAfterMultipart } from './tenantContextUpload';

describe('ensureTenantContextAfterMultipart', () => {
  const next = vi.fn() as NextFunction;
  const res = {} as Response;
  const tenantContext = () => {
    if (!mocks.tenantContext) {
      throw new Error('tenantContext mock not initialized');
    }
    return mocks.tenantContext;
  };

  beforeEach(() => {
    next.mockReset();
    tenantContext().clear();
    mocks.resolve.mockReset();
    mocks.findById.mockReset();
    mocks.resolveContextData.mockImplementation(async (tenant: { id: string }) => ({
      ...mocks.tenantData,
      id: tenant.id,
    }));
  });

  it('continues when tenant context is already present', async () => {
    tenantContext().run(mocks.tenantData, async () => {
      await ensureTenantContextAfterMultipart({} as Request, res, next);
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('rebinds tenant context from resolver after multipart parsing', async () => {
    mocks.resolve.mockResolvedValue({
      type: 'tenant',
      tenant: mocks.tenantData,
    } as never);

    await ensureTenantContextAfterMultipart({ headers: {} } as Request, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(mocks.resolve).toHaveBeenCalled();
  });

  it('falls back to JWT tenant id when resolver has no tenant context', async () => {
    mocks.resolve.mockResolvedValue({ type: 'platform' } as never);
    mocks.findById.mockResolvedValue({ id: 'tenant-jwt' } as never);

    await ensureTenantContextAfterMultipart({
      headers: {},
      user: { tenantId: 'tenant-jwt' },
    } as Request, res, next);

    expect(mocks.findById).toHaveBeenCalledWith('tenant-jwt');
    expect(next).toHaveBeenCalledWith();
  });

  it('returns TenantContextMissingError when context cannot be restored', async () => {
    mocks.resolve.mockResolvedValue({ type: 'platform' } as never);

    await ensureTenantContextAfterMultipart({ headers: {} } as Request, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(TenantContextMissingError));
  });
});
