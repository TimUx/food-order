import { prisma } from '../config/database';
import type { TenantRepository } from '../repositories/tenantRepository';
import type { TenantService } from './tenant/TenantService';
import type { PlatformContext } from './tenant/PlatformContext';
import type { AuditLogEntry } from './types';
import type { CreateTenantInput, TenantRecord, UpdateTenantInput } from './tenant/types';
import { tenantOnboardingService } from './TenantOnboardingService';
import { tenantPurgeService } from './tenant/TenantPurgeService';
import { AppError } from '../middleware/errorHandler';
import type { ModuleRegistry } from './ModuleRegistry';
import type { TenantResolver } from './tenant/TenantResolver';
import { isPreviewModule } from './manifest';

export interface TenantModuleEntitlement {
  moduleId: string;
  name: string;
  description: string;
  version: string;
  productionReady: boolean;
  preview: boolean;
  available: boolean;
  installed: boolean;
  enabled: boolean;
}

export interface TenantListFilter {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface TenantListItem extends TenantRecord {
  stats: {
    activeUsers: number;
    events: number;
    activeEvents: number;
    modules: number;
    ordersTotal: number;
  };
}

export class PlatformTenantAdminService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly tenantRepository: TenantRepository,
    private readonly platformContext: PlatformContext,
    private readonly audit: { log: (entry: AuditLogEntry) => Promise<void> },
    private readonly moduleRegistry: ModuleRegistry,
    private readonly tenantResolver?: Pick<TenantResolver, 'invalidateCache'>
  ) {}

  async list(filter: TenantListFilter = {}): Promise<{ items: TenantListItem[]; total: number }> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 25, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { slug: { contains: filter.search, mode: 'insensitive' } },
        { subdomain: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.tenant.count({ where }),
    ]);

    const items = await Promise.all(
      tenants.map(async (tenant) => ({
        ...tenant,
        stats: await this.getTenantStats(tenant.id),
      }))
    );

    return { items, total };
  }

  async getDetail(id: string): Promise<TenantListItem | null> {
    const tenant = await this.tenantService.findById(id);
    if (!tenant) return null;
    return { ...tenant, stats: await this.getTenantStats(id) };
  }

  async create(input: CreateTenantInput, actorId: string): Promise<TenantRecord> {
    const defaults = this.platformContext.current();
    const slug = input.slug.trim();
    const enriched: CreateTenantInput = {
      ...input,
      slug,
      subdomain: (input.subdomain?.trim() || slug),
      locale: input.locale ?? defaults.defaultLocale,
      timezone: input.timezone ?? defaults.defaultTimezone,
      currency: input.currency ?? defaults.defaultCurrency,
      theme: input.theme ?? defaults.defaultTheme,
    };
    const tenant = await this.tenantService.create(enriched);
    await this.applyDefaultModules(tenant.id);
    await this.audit.log({
      action: 'platform.tenant.create',
      actorId,
      tenantId: tenant.id,
      details: { slug: tenant.slug, name: tenant.name },
    });
    if (tenant.status === 'ACTIVE') {
      await tenantOnboardingService.onboardNewTenant(tenant, {
        contactName: input.contactName,
        email: input.email,
        organizationName: tenant.name,
      });
    }
    return tenant;
  }

  async update(id: string, input: UpdateTenantInput, actorId: string): Promise<TenantRecord> {
    const payload: UpdateTenantInput = { ...input };
    if (payload.slug !== undefined && payload.subdomain === undefined) {
      payload.subdomain = payload.slug.trim();
    }
    const tenant = await this.tenantService.update(id, payload);
    await this.audit.log({
      action: 'platform.tenant.update',
      actorId,
      tenantId: id,
      details: input as Record<string, unknown>,
    });
    return tenant;
  }

  async activate(id: string, actorId: string): Promise<TenantRecord> {
    const tenant = await this.tenantService.update(id, {
      status: 'ACTIVE',
      activatedAt: new Date(),
      archivedAt: null,
    });
    await this.audit.log({ action: 'platform.tenant.activate', actorId, tenantId: id });
    await tenantOnboardingService.ensureAdministrator(tenant, {
      contactName: tenant.contactName,
      email: tenant.email,
    });
    return tenant;
  }

  async suspend(id: string, actorId: string): Promise<TenantRecord> {
    const tenant = await this.tenantService.update(id, { status: 'SUSPENDED' });
    await this.audit.log({ action: 'platform.tenant.suspend', actorId, tenantId: id });
    return tenant;
  }

  async archive(id: string, actorId: string): Promise<TenantRecord> {
    const tenant = await this.tenantService.archive(id);
    await this.audit.log({ action: 'platform.tenant.archive', actorId, tenantId: id });
    return tenant;
  }

  async delete(id: string, actorId: string): Promise<void> {
    const tenant = await this.tenantService.findById(id);
    if (!tenant) throw new AppError(404, 'Mandant nicht gefunden');

    await tenantPurgeService.purge(id, tenant.slug);
    this.tenantResolver?.invalidateCache();

    await this.audit.log({
      action: 'platform.tenant.delete',
      actorId,
      details: { tenantId: id, slug: tenant.slug, name: tenant.name },
    });
  }

  async resendAccessInfo(id: string, actorId: string): Promise<{ email: string; adminCreated: boolean }> {
    const tenant = await this.tenantService.findById(id);
    if (!tenant) throw new AppError(404, 'Mandant nicht gefunden');
    const result = await tenantOnboardingService.resendAccessInfo(tenant);
    await this.audit.log({
      action: 'platform.tenant.access_info_resent',
      actorId,
      tenantId: id,
      details: { email: result.email, adminCreated: result.adminCreated },
    });
    return result;
  }

  async listModuleEntitlements(tenantId: string): Promise<TenantModuleEntitlement[]> {
    const tenant = await this.tenantService.findById(tenantId);
    if (!tenant) throw new AppError(404, 'Mandant nicht gefunden');

    const showPreview = process.env.SHOW_PREVIEW_MODULES === '1';
    const manifests = this.moduleRegistry.getAllManifests().filter(
      (manifest) => showPreview || !isPreviewModule(manifest)
    );
    const rows = await prisma.tenantModule.findMany({ where: { tenantId } });
    const rowMap = new Map(rows.map((row) => [row.moduleId, row]));

    return manifests.map((manifest) => {
      const row = rowMap.get(manifest.id);
      return {
        moduleId: manifest.id,
        name: manifest.name,
        description: manifest.description,
        version: manifest.version,
        productionReady: manifest.productionReady,
        preview: isPreviewModule(manifest),
        available: Boolean(row?.available),
        installed: Boolean(row?.installed),
        enabled: Boolean(row?.enabled),
      };
    });
  }

  async updateModuleEntitlements(
    tenantId: string,
    moduleIds: string[],
    actorId: string
  ): Promise<TenantModuleEntitlement[]> {
    const tenant = await this.tenantService.findById(tenantId);
    if (!tenant) throw new AppError(404, 'Mandant nicht gefunden');

    const showPreview = process.env.SHOW_PREVIEW_MODULES === '1';
    const knownIds = new Set(
      this.moduleRegistry.getAllManifests()
        .filter((manifest) => showPreview || !isPreviewModule(manifest))
        .map((manifest) => manifest.id)
    );
    const uniqueIds = [...new Set(moduleIds)];
    for (const moduleId of uniqueIds) {
      if (!knownIds.has(moduleId)) {
        throw new AppError(400, `Unbekanntes Modul: ${moduleId}`);
      }
    }

    const selected = new Set(uniqueIds);
    const existingRows = await prisma.tenantModule.findMany({ where: { tenantId } });
    const existingMap = new Map(existingRows.map((row) => [row.moduleId, row]));

    for (const moduleId of knownIds) {
      const shouldBeAvailable = selected.has(moduleId);
      const row = existingMap.get(moduleId);

      if (shouldBeAvailable) {
        await prisma.tenantModule.upsert({
          where: { tenantId_moduleId: { tenantId, moduleId } },
          create: {
            tenantId,
            moduleId,
            available: true,
            installed: false,
            enabled: false,
          },
          update: { available: true },
        });
        continue;
      }

      if (!row?.available) continue;

      if (row.enabled) {
        await prisma.tenantModule.update({
          where: { tenantId_moduleId: { tenantId, moduleId } },
          data: { available: false, enabled: false },
        });
      } else {
        await prisma.tenantModule.update({
          where: { tenantId_moduleId: { tenantId, moduleId } },
          data: { available: false },
        });
      }
    }

    await this.audit.log({
      action: 'platform.tenant.modules.updated',
      actorId,
      tenantId,
      details: { moduleIds: uniqueIds },
    });

    return this.listModuleEntitlements(tenantId);
  }

  async exportTenant(id: string): Promise<Record<string, unknown>> {
    const tenant = await this.tenantService.findById(id);
    if (!tenant) throw new Error('Mandant nicht gefunden');
    const [users, events, modules, settings] = await Promise.all([
      prisma.user.count({ where: { tenantId: id } }),
      prisma.event.findMany({ where: { tenantId: id }, select: { id: true, name: true, date: true, isActive: true } }),
      prisma.tenantModule.findMany({ where: { tenantId: id } }),
      prisma.tenantSettings.findUnique({ where: { tenantId: id } }),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      tenant,
      summary: { users, events: events.length, modules: modules.length },
      events,
      modules,
      settings,
      note: 'Vollständiger Export/Import in Phase 4+',
    };
  }

  private async getTenantStats(tenantId: string) {
    const [activeUsers, events, activeEvents, modules, ordersTotal] = await Promise.all([
      prisma.user.count({ where: { tenantId, active: true } }),
      prisma.event.count({ where: { tenantId } }),
      prisma.event.count({ where: { tenantId, isActive: true } }),
      prisma.tenantModule.count({ where: { tenantId, enabled: true } }),
      prisma.order.count({ where: { tenantId } }),
    ]);
    return { activeUsers, events, activeEvents, modules, ordersTotal };
  }

  private async applyDefaultModules(tenantId: string): Promise<void> {
    const rows = await prisma.platformSettings.findUnique({
      where: { key: 'platform.defaults.modules' },
    });
    const moduleIds = Array.isArray(rows?.value)
      ? (rows.value as string[])
      : ['payment', 'notifications', 'legal'];
    for (const moduleId of moduleIds) {
      await prisma.tenantModule.upsert({
        where: { tenantId_moduleId: { tenantId, moduleId } },
        create: { tenantId, moduleId, available: true, installed: false, enabled: false },
        update: { available: true },
      });
    }
  }
}
