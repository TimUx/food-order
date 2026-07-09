import { prisma } from '../config/database';
import type { Prisma, TenantModule } from '@prisma/client';
import { requireTenantId } from '../platform/tenant/tenantScope';

export function tenantModuleWhere(moduleId: string) {
  return {
    tenantId_moduleId: {
      tenantId: requireTenantId(),
      moduleId,
    },
  };
}

export const tenantModuleRepository = {
  findUnique(moduleId: string): Promise<TenantModule | null> {
    return prisma.tenantModule.findUnique({ where: tenantModuleWhere(moduleId) });
  },

  findManyForTenant(): Promise<TenantModule[]> {
    return prisma.tenantModule.findMany({
      where: { tenantId: requireTenantId() },
    });
  },

  upsert(
    moduleId: string,
    create: Omit<Prisma.TenantModuleUncheckedCreateInput, 'tenantId' | 'moduleId'>,
    update: Prisma.TenantModuleUncheckedUpdateInput
  ): Promise<TenantModule> {
    const tenantId = requireTenantId();
    return prisma.tenantModule.upsert({
      where: tenantModuleWhere(moduleId),
      create: {
        tenantId,
        moduleId,
        ...create,
      },
      update,
    });
  },

  update(
    moduleId: string,
    data: Prisma.TenantModuleUncheckedUpdateInput
  ): Promise<TenantModule> {
    return prisma.tenantModule.update({
      where: tenantModuleWhere(moduleId),
      data,
    });
  },

  updateScoped(
    moduleId: string,
    data: Prisma.TenantModuleUncheckedUpdateInput
  ): Promise<{ count: number }> {
    return prisma.tenantModule.updateMany({
      where: { tenantId: requireTenantId(), moduleId },
      data,
    });
  },
};
