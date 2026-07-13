import jwt from 'jsonwebtoken';
import { RoleName } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../config/database';
import type { AuthPayload } from '../middleware/platformAuth';
import { AppError } from '../middleware/errorHandler';
import type { AuditLogEntry } from './types';
import { platformSessionService } from '../services/platformSessionService';
import { platformContext } from './bootstrap';
import { platformDomainService, isLocalPlatformDomain } from './PlatformDomainService';
import { tenantOnboardingService } from './TenantOnboardingService';
import type { TenantRecord } from './tenant/types';

export class ImpersonationService {
  constructor(private readonly audit: { log: (entry: AuditLogEntry) => Promise<void> }) {}

  private toTenantRecord(tenant: {
    id: string;
    name: string;
    shortName: string | null;
    slug: string;
    subdomain: string;
    status: TenantRecord['status'];
    contactName: string | null;
    email: string | null;
    phone: string | null;
    logoUrl: string | null;
    locale: string;
    timezone: string;
    currency: string;
    theme: string;
    description: string | null;
    address: string | null;
    website: string | null;
    activatedAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): TenantRecord {
    return tenant;
  }

  async startImpersonation(
    platformUserId: string,
    platformSessionId: string,
    tenantId: string
  ) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new AppError(404, 'Mandant nicht gefunden');
    if (tenant.status !== 'ACTIVE') {
      throw new AppError(400, 'Nur aktive Mandanten können impersoniert werden');
    }

    let adminUser = await prisma.user.findFirst({
      where: { tenantId, role: { name: RoleName.ADMIN } },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!adminUser) {
      await tenantOnboardingService.ensureAdministrator(this.toTenantRecord(tenant), {
        contactName: tenant.contactName,
        email: tenant.email,
      });
      adminUser = await prisma.user.findFirst({
        where: { tenantId, role: { name: RoleName.ADMIN }, active: true },
        include: { role: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!adminUser) {
      throw new AppError(
        400,
        'Kein Administrator im Mandanten vorhanden. Bitte E-Mail-Adresse am Mandanten hinterlegen oder „Infos senden“ nutzen.'
      );
    }

    if (!adminUser.active) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { active: true },
      });
    }

    const payload: AuthPayload = {
      userId: adminUser.id,
      email: adminUser.email ?? adminUser.username ?? '',
      role: adminUser.role.name,
      scope: 'tenant',
      tenantId: tenant.id,
      impersonation: {
        platformUserId,
        platformSessionId,
        tenantId: tenant.id,
        tenantName: tenant.name,
      },
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: '30m',
    } as jwt.SignOptions);

    await this.audit.log({
      action: 'platform.tenant.impersonate.start',
      actorId: platformUserId,
      tenantId,
      details: {
        impersonatedUserId: adminUser.id,
        tenantName: tenant.name,
      },
    });

    const platform = platformContext.current();
    const domains = platformDomainService.getPublicView(platform);
    const proto = platformDomainService.resolveProto();
    const redirectTo = isLocalPlatformDomain(domains.platformDomain)
        ? `/${tenant.slug}/admin`
        : platformDomainService.buildTenantUrl(domains, tenant.slug, '/admin', proto);

    return {
      token: accessToken,
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, subdomain: tenant.subdomain },
      impersonation: payload.impersonation,
      redirectTo,
    };
  }

  async endImpersonation(platformUserId: string, platformSessionId: string) {
    const { platformUserRepository } = await import('../repositories/platformUserRepository');
    const { parsePlatformPermissions } = await import('./platformPermissions');

    const user = await platformUserRepository.findById(platformUserId);
    if (!user || !user.active) {
      throw new AppError(401, 'Plattformbenutzer nicht gefunden');
    }

    const permissions = parsePlatformPermissions(user.permissions);
    const payload: Omit<AuthPayload, 'sessionId'> = {
      userId: user.id,
      email: user.email,
      role: 'PLATFORM_ADMIN',
      scope: 'platform',
      permissions,
    };

    const valid = await platformSessionService.validateSession(platformSessionId);
    if (!valid) {
      throw new AppError(401, 'Plattform-Sitzung abgelaufen – bitte erneut anmelden');
    }

    const accessToken = jwt.sign(
      { ...payload, sessionId: platformSessionId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );

    await this.audit.log({
      action: 'platform.tenant.impersonate.end',
      actorId: platformUserId,
    });

    return { token: accessToken };
  }
}
