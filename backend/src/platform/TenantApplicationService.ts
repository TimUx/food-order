import { prisma } from '../config/database';
import type { TenantApplicationStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import type { PlatformContext } from './tenant/PlatformContext';
import type { PlatformTenantAdminService } from './PlatformTenantAdminService';
import type { AuditLogEntry } from './types';
import { platformNotificationService } from './notifications/platformNotificationService';
import { tenantOnboardingService } from './TenantOnboardingService';

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
      throw new AppError(400, 'Bitte eine gültige Internetadresse angeben (mind. 3 Zeichen, nur Kleinbuchstaben, Zahlen und Bindestriche).');
    }
    if ((platform.reservedSubdomains ?? []).includes(subdomain)) {
      throw new AppError(400, 'Diese Internetadresse ist reserviert.');
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
      throw new AppError(409, 'Diese Internetadresse ist bereits vergeben oder beantragt.');
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
    const application = await prisma.tenantApplication.findUnique({ where: { id } });
    if (!application) return null;

    let linkedTenant: { id: string; name: string; slug: string; status: string } | null = null;
    if (application.tenantId) {
      linkedTenant = await prisma.tenant.findUnique({
        where: { id: application.tenantId },
        select: { id: true, name: true, slug: true, status: true },
      });
    }

    return { ...application, linkedTenant };
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

    if (application.tenantId) {
      const updated = await prisma.tenantApplication.update({
        where: { id },
        data: {
          status: 'APPROVED',
          adminComment: options.adminComment ?? application.adminComment,
          reviewedBy: actorId,
          reviewedAt: new Date(),
        },
      });
      const tenant = await this.tenantAdmin.getDetail(application.tenantId);
      if (tenant) {
        await tenantOnboardingService.ensureAdministrator(tenant, {
          contactName: application.contactName,
          email: application.email,
        });
        if (options.createTenant !== false) {
          await tenantOnboardingService.onboardNewTenant(tenant, {
            contactName: application.contactName,
            email: application.email,
            organizationName: application.organization,
          });
        }
      }
      return { application: updated, tenantId: application.tenantId };
    }

    let tenantId: string | null = null;

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
          address: [application.street, `${application.postalCode} ${application.city}`.trim(), application.country]
            .filter(Boolean)
            .join(', '),
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

    if (tenantId) {
      const tenant = await this.tenantAdmin.getDetail(tenantId);
      if (tenant) {
        try {
          await tenantOnboardingService.ensureAdministrator(tenant, {
            contactName: application.contactName,
            email: application.email,
          });
          if (options.createTenant !== false) {
            await tenantOnboardingService.onboardNewTenant(tenant, {
              contactName: application.contactName,
              email: application.email,
              organizationName: application.organization,
            });
          }
        } catch (err) {
          logger.error('Mandanten-Onboarding nach Genehmigung fehlgeschlagen', {
            tenantId,
            applicationId: id,
            error: err instanceof Error ? err.message : String(err),
          });
          throw err instanceof AppError
            ? err
            : new AppError(500, 'Mandant wurde angelegt, aber der Administrator konnte nicht eingerichtet werden.');
        }
      }
    }

    return { application: updated, tenantId };
  }

  async reject(id: string, actorId: string, adminComment?: string) {
    return this.updateStatus(id, 'REJECTED', actorId, adminComment);
  }

  async archive(id: string, actorId: string) {
    return this.updateStatus(id, 'ARCHIVED', actorId);
  }

  async delete(id: string, actorId: string) {
    const existing = await prisma.tenantApplication.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Bewerbung nicht gefunden');

    await prisma.tenantApplication.delete({ where: { id } });

    await this.audit.log({
      action: 'platform.application.deleted',
      actorId,
      tenantId: existing.tenantId ?? undefined,
      details: { applicationId: id, organization: existing.organization },
    });
  }

  async setTenantLink(id: string, tenantId: string | null, actorId: string) {
    const application = await prisma.tenantApplication.findUnique({ where: { id } });
    if (!application) throw new AppError(404, 'Bewerbung nicht gefunden');

    if (tenantId === null) {
      const updated = await prisma.tenantApplication.update({
        where: { id },
        data: { tenantId: null },
      });
      await this.audit.log({
        action: 'platform.application.tenant_unlinked',
        actorId,
        details: { applicationId: id },
      });
      return updated;
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new AppError(404, 'Mandant nicht gefunden');

    const otherLink = await prisma.tenantApplication.findFirst({
      where: { tenantId, id: { not: id } },
    });
    if (otherLink) {
      throw new AppError(409, 'Dieser Mandant ist bereits mit einer anderen Bewerbung verknüpft.');
    }

    const updated = await prisma.tenantApplication.update({
      where: { id },
      data: {
        tenantId,
        status: 'APPROVED',
        reviewedBy: actorId,
        reviewedAt: new Date(),
      },
    });

    await this.audit.log({
      action: 'platform.application.tenant_linked',
      actorId,
      tenantId,
      details: { applicationId: id },
    });

    await tenantOnboardingService.ensureAdministrator(tenant, {
      contactName: application.contactName,
      email: application.email,
    });

    return updated;
  }
}
