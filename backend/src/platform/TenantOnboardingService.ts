import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { RoleName } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import type { TenantRecord } from './tenant/types';
import { platformNotificationService } from './notifications/platformNotificationService';

export interface ProvisionedAdminCredentials {
  userId: string;
  email: string;
  username: string | null;
  temporaryPassword: string;
  firstName: string;
  lastName: string;
  created: boolean;
}

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(16);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function splitContactName(fullName?: string | null): { firstName: string; lastName: string } {
  const trimmed = (fullName ?? '').trim();
  if (!trimmed) return { firstName: 'Administrator', lastName: 'Verein' };
  const parts = trimmed.split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') || 'Verein' };
}

async function sendAccessInfoEmail(
  tenant: TenantRecord,
  admin: ProvisionedAdminCredentials,
  organizationName: string,
  resent: boolean
): Promise<void> {
  const { platformContext } = await import('./bootstrap');
  const { platformDomainService } = await import('./PlatformDomainService');
  const platform = platformContext.current();
  const domains = platformDomainService.getPublicView(platform);
  const proto = platformDomainService.resolveProto();
  await platformNotificationService.notifyTenantApproved({
    organizationName,
    admin,
    adminUrl: platformDomainService.buildTenantUrl(domains, tenant.slug, '/admin/login', proto),
    publicUrl: platformDomainService.buildTenantUrl(domains, tenant.slug, '/public', proto),
    tenantSlug: tenant.slug,
    resent,
  });
}

export const tenantOnboardingService = {
  async ensureClubSettings(tenant: TenantRecord): Promise<void> {
    await prisma.clubSettings.upsert({
      where: { tenantId: tenant.id },
      create: {
        id: `club-${tenant.id}`,
        tenantId: tenant.id,
        clubName: tenant.name,
        description: tenant.description ?? undefined,
        contactName: tenant.contactName ?? undefined,
        email: tenant.email ?? undefined,
        phone: tenant.phone ?? undefined,
        address: tenant.address ?? undefined,
        website: tenant.website ?? undefined,
      },
      update: {
        clubName: tenant.name,
        contactName: tenant.contactName ?? undefined,
        email: tenant.email ?? undefined,
        phone: tenant.phone ?? undefined,
        address: tenant.address ?? undefined,
        website: tenant.website ?? undefined,
      },
    });
  },

  async provisionAdministrator(
    tenant: TenantRecord,
    contact?: { contactName?: string | null; email?: string | null }
  ): Promise<ProvisionedAdminCredentials | null> {
    const email = (contact?.email ?? tenant.email)?.trim().toLowerCase();
    if (!email) {
      logger.warn('Mandanten-Onboarding: Keine E-Mail für Administrator', { tenantId: tenant.id });
      return null;
    }

    const existing = await prisma.user.findFirst({
      where: { tenantId: tenant.id, active: true, role: { name: RoleName.ADMIN } },
    });
    if (existing) {
      return {
        userId: existing.id,
        email: existing.email ?? email,
        username: existing.username,
        temporaryPassword: '',
        firstName: existing.firstName,
        lastName: existing.lastName,
        created: false,
      };
    }

    const adminRole = await prisma.role.findUnique({ where: { name: RoleName.ADMIN } });
    if (!adminRole) throw new Error('ADMIN-Rolle nicht gefunden');

    const { firstName, lastName } = splitContactName(contact?.contactName ?? tenant.contactName);
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        firstName,
        lastName,
        passwordHash,
        passwordEnabled: true,
        magicLinkEnabled: true,
        roleId: adminRole.id,
      },
    });

    return {
      userId: user.id,
      email,
      username: user.username,
      temporaryPassword,
      firstName,
      lastName,
      created: true,
    };
  },

  async onboardNewTenant(
    tenant: TenantRecord,
    options: {
      contactName?: string | null;
      email?: string | null;
      organizationName?: string;
    } = {}
  ): Promise<ProvisionedAdminCredentials | null> {
    await this.ensureClubSettings(tenant);
    const admin = await this.provisionAdministrator(tenant, {
      contactName: options.contactName,
      email: options.email,
    });
    if (admin?.created && admin.temporaryPassword) {
      await sendAccessInfoEmail(tenant, admin, options.organizationName ?? tenant.name, false);
    }
    return admin;
  },

  async resendAccessInfo(tenant: TenantRecord): Promise<{ email: string; adminCreated: boolean }> {
    await this.ensureClubSettings(tenant);

    const contactEmail = tenant.email?.trim().toLowerCase();
    if (!contactEmail) {
      throw new AppError(400, 'Am Mandanten ist keine E-Mail-Adresse hinterlegt.');
    }

    const existingAdmin = await prisma.user.findFirst({
      where: { tenantId: tenant.id, active: true, role: { name: RoleName.ADMIN } },
      orderBy: { createdAt: 'asc' },
    });

    let admin: ProvisionedAdminCredentials;

    if (!existingAdmin) {
      const provisioned = await this.provisionAdministrator(tenant, {
        contactName: tenant.contactName,
        email: contactEmail,
      });
      if (!provisioned?.temporaryPassword) {
        throw new AppError(500, 'Administrator konnte nicht angelegt werden.');
      }
      admin = provisioned;
    } else {
      const temporaryPassword = generateTemporaryPassword();
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          passwordHash,
          passwordEnabled: true,
        },
      });
      const { sessionService } = await import('../services/sessionService');
      await sessionService.revokeAllUserSessions(existingAdmin.id);

      admin = {
        userId: existingAdmin.id,
        email: existingAdmin.email ?? contactEmail,
        username: existingAdmin.username,
        temporaryPassword,
        firstName: existingAdmin.firstName,
        lastName: existingAdmin.lastName,
        created: false,
      };
    }

    await sendAccessInfoEmail(tenant, admin, tenant.name, true);
    return { email: admin.email, adminCreated: !existingAdmin };
  },
};
