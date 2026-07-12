import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createTenantContextMiddleware } from './tenantContext';
import { TenantContext } from '../platform/tenant/TenantContext';
import type { TenantService } from '../platform/tenant/TenantService';
import type { TenantResolver } from '../platform/tenant/TenantResolver';
import { DEFAULT_TENANT_SETTINGS } from '../platform/tenant/types';

describe('tenantContext middleware', () => {
  const tenantContext = new TenantContext();
  let tenantService: TenantService;
  let tenantResolver: TenantResolver;
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
    tenantService = {
      getDefaultTenant: vi.fn(),
      resolveContextData: vi.fn(),
    } as unknown as TenantService;
    tenantResolver = {
      resolve: vi.fn(),
    } as unknown as TenantResolver;
  });

  it('sets tenant context for resolved tenant requests', async () => {
    const middleware = createTenantContextMiddleware(tenantContext, tenantResolver, tenantService);
    const tenantData = {
      id: 't1',
      name: 'Test',
      shortName: null,
      slug: 'test',
      subdomain: 'test',
      status: 'ACTIVE' as const,
      locale: 'de-DE',
      timezone: 'Europe/Berlin',
      currency: 'EUR',
      theme: 'default',
      logoUrl: null,
      contactName: null,
      email: null,
      phone: null,
      description: null,
      address: null,
      website: null,
      settings: DEFAULT_TENANT_SETTINGS,
    };

    vi.mocked(tenantResolver.resolve).mockResolvedValue({
      type: 'tenant',
      tenant: tenantData,
      matchedBy: 'path_prefix',
    });

    const req = { path: '/api/public/tenant' } as Request;
    const res = {} as Response;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(tenantContext.exists()).toBe(false);
  });
});
