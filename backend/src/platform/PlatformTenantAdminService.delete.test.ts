import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlatformTenantAdminService } from './PlatformTenantAdminService';
import type { TenantService } from './tenant/TenantService';
import type { TenantRepository } from '../repositories/tenantRepository';
import type { PlatformContext } from './tenant/PlatformContext';
import type { ModuleRegistry } from './ModuleRegistry';

const tenantId = '00000000-0000-0000-0000-000000000001';
const actorId = '00000000-0000-0000-0000-000000000099';

vi.mock('./tenant/TenantPurgeService', () => ({
  tenantPurgeService: {
    purge: vi.fn(),
  },
}));

import { tenantPurgeService } from './tenant/TenantPurgeService';

describe('PlatformTenantAdminService.delete', () => {
  const tenantService = {
    findById: vi.fn(),
  } as unknown as TenantService;

  const tenantResolver = {
    invalidateCache: vi.fn(),
  };

  const audit = { log: vi.fn() };

  const service = new PlatformTenantAdminService(
    tenantService,
    {} as TenantRepository,
    {} as PlatformContext,
    audit,
    {} as ModuleRegistry,
    tenantResolver
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tenantService.findById).mockResolvedValue({
      id: tenantId,
      slug: 'demo',
      name: 'Demo Verein',
    } as never);
    vi.mocked(tenantPurgeService.purge).mockResolvedValue(undefined);
  });

  it('purges tenant data and writes platform audit without tenant reference', async () => {
    await service.delete(tenantId, actorId);

    expect(tenantPurgeService.purge).toHaveBeenCalledWith(tenantId, 'demo');
    expect(tenantResolver.invalidateCache).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith({
      action: 'platform.tenant.delete',
      actorId,
      details: { tenantId, slug: 'demo', name: 'Demo Verein' },
    });
  });

  it('returns 404 when tenant does not exist', async () => {
    vi.mocked(tenantService.findById).mockResolvedValue(null);

    await expect(service.delete(tenantId, actorId)).rejects.toMatchObject({ statusCode: 404 });
    expect(tenantPurgeService.purge).not.toHaveBeenCalled();
  });
});
