import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlatformTenantAdminService } from './PlatformTenantAdminService';
import type { TenantService } from './tenant/TenantService';
import type { TenantRepository } from '../repositories/tenantRepository';
import type { PlatformContext } from './tenant/PlatformContext';
import type { ModuleRegistry } from './ModuleRegistry';

const tenantId = '00000000-0000-0000-0000-000000000001';
const actorId = '00000000-0000-0000-0000-000000000099';

vi.mock('../config/database', () => ({
  prisma: {
    tenantModule: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    platformSettings: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '../config/database';

describe('PlatformTenantAdminService module entitlements', () => {
  const tenantService = {
    findById: vi.fn(),
  } as unknown as TenantService;

  const moduleRegistry = {
    getAllManifests: vi.fn(),
  } as unknown as ModuleRegistry;

  const service = new PlatformTenantAdminService(
    tenantService,
    {} as TenantRepository,
    {} as PlatformContext,
    { log: vi.fn() },
    moduleRegistry
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tenantService.findById).mockResolvedValue({
      id: tenantId,
      name: 'Test',
      slug: 'test',
    } as never);
    vi.mocked(moduleRegistry.getAllManifests).mockReturnValue([
      {
        id: 'payment',
        name: 'Zahlung',
        description: 'Online-Zahlung',
        version: '1.0.0',
        productionReady: true,
        preview: false,
      },
      {
        id: 'legal',
        name: 'Rechtliches',
        description: 'Impressum & Datenschutz',
        version: '1.0.0',
        productionReady: true,
        preview: false,
      },
    ] as never);
  });

  it('lists module entitlements with availability from DB', async () => {
    vi.mocked(prisma.tenantModule.findMany).mockResolvedValue([
      {
        tenantId,
        moduleId: 'payment',
        available: true,
        installed: true,
        enabled: true,
      },
    ] as never);

    const result = await service.listModuleEntitlements(tenantId);

    expect(result).toHaveLength(2);
    expect(result.find((m) => m.moduleId === 'payment')).toMatchObject({
      available: true,
      enabled: true,
    });
    expect(result.find((m) => m.moduleId === 'legal')).toMatchObject({
      available: false,
      preview: false,
    });
  });

  it('updates module entitlements and disables revoked active modules', async () => {
    vi.mocked(prisma.tenantModule.findMany).mockResolvedValue([
      { tenantId, moduleId: 'payment', available: true, installed: true, enabled: true },
    ] as never);
    vi.mocked(prisma.tenantModule.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.tenantModule.update).mockResolvedValue({} as never);

    await service.updateModuleEntitlements(tenantId, [], actorId);

    expect(prisma.tenantModule.update).toHaveBeenCalledWith({
      where: { tenantId_moduleId: { tenantId, moduleId: 'payment' } },
      data: { available: false, enabled: false },
    });
  });
});
