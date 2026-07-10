import { prisma } from '../config/database';
import type { TenantApplicationStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import type { PlatformContext } from './tenant/PlatformContext';
import type { PlatformTenantAdminService } from './PlatformTenantAdminService';
import type { AuditLogEntry } from './types';
import { platformNotificationService } from './notifications/platformNotificationService';

export interface SubmitTenantApplicationInput {
  organization: string;
  organizationType: string;
  contactName: string;
  street: string;
  postalCode: string;
  city: string;
  country?: string;
  email: string;
  phone?: string;
  website?: string;
  memberCount?: number;
  eventsPerYear?: number;
  reason: string;
  desiredFeatures: string;
  freeTierJustification: string;
  plannedUsage: string;
  notes?: string;
  requestedSubdomain: string;
  privacyAccepted: boolean;
  termsAccepted: boolean;
}

export interface TenantApplicationListFilter {
  status?: TenantApplicationStatus;
  search?: string;
  page?: number;
  limit?: number;
}

function normalizeSubdomain(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export class TenantApplicationService {
  constructor(
    private readonly platformContext: PlatformContext,
    private readonly tenantAdmin: PlatformTenantAdminService,
    private readonly audit: { log: (entry: AuditLogEntry) => Promise<void> }
  ) {}

  async submit(input: SubmitTenantApplicationInput): Promise<{ id: string }> {
    const platform = this.platformContext.current();
    if (!platform.registrationEnabled) {
      throw new AppError(403, 'Mandantenbewerbungen sind derzeit nicht möglich.');
    }
    if (!input.privacyAccepted || !input.termsAccepted) {
      throw new AppError(400, 'Datenschutz und Nutzungsbedingungen müssen akzeptiert werden.');
    }

    const subdomain = normalizeSubdomain(input.requestedSubdomain);
    if (!subdomain || subdomain.length < 3) {
      throw new AppError(400, 'Bitte eine gültige Subdomain (mind. 3 Zeichen) angeben.');
    }
    if ((platform.reservedSubdomains ?? []).includes(subdomain)) {
      throw new AppError(400, 'Diese Subdomain ist reserviert.');
    }

    const [existingTenant, existingApp] = await Promise.all([
      prisma.tenant.findFirst({
        where: { OR: [{ slug: subdomain }, { subdomain }] },
      }),
      prisma.tenantApplication.findFirst({
        where: {
          requestedSubdomain: subdomain,
          status: { notIn: ['REJECTED', 'ARCHIVED'] },
        },
      }),
    ]);

    if (existingTenant || existingApp) {
      throw new AppError(409, 'Diese Subdomain ist bereits vergeben oder beantragt.');
    }

    const application = await prisma.tenantApplication.create({
      data: {
        organization: input.organization.trim(),
        organizationType: input.organizationType.trim(),
        contactName: input.contactName.trim(),
        street: input.street.trim(),
        postalCode: input.postalCode.trim(),
        city: input.city.trim(),
        country: input.country?.trim() || 'Deutschland',
        email: input.email.trim().toLowerCase(),
        phone: input.phone?.trim() || null,
        website: input.website?.trim() || null,
        memberCount: input.memberCount ?? null,
        eventsPerYear: input.eventsPerYear ?? null,
        reason: input.reason.trim(),
        desiredFeatures: input.desiredFeatures.trim(),
        freeTierJustification: input.freeTierJustification.trim(),
        plannedUsage: input.plannedUsage.trim(),
        notes: input.notes?.trim() || null,
        requestedSubdomain: subdomain,
        privacyAccepted: true,
        termsAccepted: true,
      },
    });

    await this.audit.log({
      action: 'platform.application.submitted',
      details: { applicationId: application.id, subdomain, organization: application.organization },
    });

    await platformNotificationService.notifyApplicationSubmitted(application);
    await platformNotificationService.notifyApplicantConfirmation(application);

    return { id: application.id };
  }

  async list(filter: TenantApplicationListFilter = {}) {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 25, 100);
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { organization: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
        { contactName: { contains: filter.search, mode: 'insensitive' } },
        { requestedSubdomain: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.tenantApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.tenantApplication.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getById(id: string) {
    return prisma.tenantApplication.findUnique({ where: { id } });
  }

  async updateStatus(
    id: string,
    status: TenantApplicationStatus,
    actorId: string,
    adminComment?: string
  ) {
    const existing = await prisma.tenantApplication.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Bewerbung nicht gefunden');

    const updated = await prisma.tenantApplication.update({
      where: { id },
      data: {
        status,
        adminComment: adminComment ?? existing.adminComment,
        reviewedBy: actorId,
        reviewedAt: new Date(),
      },
    });

    await this.audit.log({
      action: `platform.application.${status.toLowerCase()}`,
      actorId,
      details: { applicationId: id, status },
    });

    return updated;
  }

  async approveAndCreateTenant(
    id: string,
    actorId: string,
    options: { createTenant?: boolean; adminComment?: string } = {}
  ) {
    const application = await prisma.tenantApplication.findUnique({ where: { id } });
    if (!application) throw new AppError(404, 'Bewerbung nicht gefunden');
    if (application.status === 'APPROVED' && application.tenantId) {
      return { application, tenantId: application.tenantId };
    }

    let tenantId = application.tenantId;

    if (options.createTenant !== false && !tenantId) {
      const tenant = await this.tenantAdmin.create(
        {
          name: application.organization,
          shortName: application.organization.slice(0, 32),
          slug: application.requestedSubdomain,
          subdomain: application.requestedSubdomain,
          status: 'PENDING',
          contactName: application.contactName,
          email: application.email,
          phone: application.phone ?? undefined,
          website: application.website ?? undefined,
          description: application.reason,
        },
        actorId
      );
      await this.tenantAdmin.activate(tenant.id, actorId);
      tenantId = tenant.id;
    }

    const updated = await prisma.tenantApplication.update({
      where: { id },
      data: {
        status: 'APPROVED',
        tenantId,
        adminComment: options.adminComment ?? application.adminComment,
        reviewedBy: actorId,
        reviewedAt: new Date(),
      },
    });

    await this.audit.log({
      action: 'platform.application.approved',
      actorId,
      tenantId: tenantId ?? undefined,
      details: { applicationId: id },
    });

    return { application: updated, tenantId };
  }

  async reject(id: string, actorId: string, adminComment?: string) {
    return this.updateStatus(id, 'REJECTED', actorId, adminComment);
  }

  async archive(id: string, actorId: string) {
    return this.updateStatus(id, 'ARCHIVED', actorId);
  }
}
