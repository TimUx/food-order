import { prisma } from '../config/database';
import type { TenantRepository } from '../repositories/tenantRepository';
import type { TenantService } from './tenant/TenantService';
import type { PlatformContext } from './tenant/PlatformContext';
import type { AuditLogEntry } from './types';
import type { CreateTenantInput, TenantRecord, UpdateTenantInput } from './tenant/types';
import { tenantOnboardingService } from './TenantOnboardingService';
import { AppError } from '../middleware/errorHandler';

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
    private readonly audit: { log: (entry: AuditLogEntry) => Promise<void> }
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
    await prisma.tenantApplication.updateMany({
      where: { tenantId: id },
      data: { tenantId: null },
    });
    await prisma.tenant.delete({ where: { id } });
    await this.audit.log({ action: 'platform.tenant.delete', actorId, tenantId: id });
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
        create: { tenantId, moduleId, installed: false, enabled: false },
        update: {},
      });
    }
  }
}
