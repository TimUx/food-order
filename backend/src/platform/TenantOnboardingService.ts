import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { RoleName } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { sessionService } from '../services/sessionService';
import type { TenantRecord } from './tenant/types';
import { platformNotificationService } from './notifications/platformNotificationService';
import { platformDomainService } from './PlatformDomainService';
import { ensureSystemRole } from '../core/roles/ensureSystemRoles';

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

async function findTenantAdmin(tenantId: string) {
  return prisma.user.findFirst({
    where: { tenantId, role: { name: RoleName.ADMIN } },
    orderBy: { createdAt: 'asc' },
  });
}

async function sendAccessInfoEmail(
  tenant: TenantRecord,
  admin: ProvisionedAdminCredentials,
  organizationName: string,
  resent: boolean
): Promise<void> {
  const domains = platformDomainService.getPublicView(undefined);
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

async function issueFreshAdminCredentials(
  user: {
    id: string;
    email: string | null;
    username: string | null;
    firstName: string;
    lastName: string;
  },
  fallbackEmail: string
): Promise<ProvisionedAdminCredentials> {
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordEnabled: true,
      active: true,
    },
  });
  await sessionService.revokeAllUserSessions(user.id);

  return {
    userId: user.id,
    email: user.email ?? fallbackEmail,
    username: user.username,
    temporaryPassword,
    firstName: user.firstName,
    lastName: user.lastName,
    created: false,
  };
}

async function ensureAdministrator(
  tenant: TenantRecord,
  contact?: { contactName?: string | null; email?: string | null }
): Promise<ProvisionedAdminCredentials | null> {
  const email = (contact?.email ?? tenant.email)?.trim().toLowerCase();
  if (!email) {
    logger.warn('Mandanten-Onboarding: Keine E-Mail für Administrator', { tenantId: tenant.id });
    return null;
  }

  const existing = await findTenantAdmin(tenant.id);
  if (existing) {
    if (!existing.active) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { active: true, passwordEnabled: true },
      });
    }
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

  const adminRole = await ensureSystemRole(RoleName.ADMIN);
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
      active: true,
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
}

async function deliverAccessInfo(
  tenant: TenantRecord,
  options: {
    contactName?: string | null;
    email?: string | null;
    organizationName?: string;
    resent: boolean;
  }
): Promise<{ email: string; adminCreated: boolean; admin: ProvisionedAdminCredentials }> {
  const contactEmail = (options.email ?? tenant.email)?.trim().toLowerCase();
  if (!contactEmail) {
    throw new AppError(400, 'Am Mandanten ist keine E-Mail-Adresse hinterlegt.');
  }

  const existingAdmin = await findTenantAdmin(tenant.id);
  let admin: ProvisionedAdminCredentials;
  let adminCreated = false;

  if (existingAdmin) {
    admin = await issueFreshAdminCredentials(existingAdmin, contactEmail);
  } else {
    const provisioned = await ensureAdministrator(tenant, {
      contactName: options.contactName,
      email: contactEmail,
    });
    if (!provisioned?.temporaryPassword) {
      throw new AppError(500, 'Administrator konnte nicht angelegt werden.');
    }
    admin = provisioned;
    adminCreated = provisioned.created;
  }

  await sendAccessInfoEmail(tenant, admin, options.organizationName ?? tenant.name, options.resent);
  return { email: admin.email, adminCreated, admin };
}

export const tenantOnboardingService = {
  ensureAdministrator,

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

  /** @deprecated Nutze ensureAdministrator */
  async provisionAdministrator(
    tenant: TenantRecord,
    contact?: { contactName?: string | null; email?: string | null }
  ): Promise<ProvisionedAdminCredentials | null> {
    return ensureAdministrator(tenant, contact);
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
    const admin = await ensureAdministrator(tenant, {
      contactName: options.contactName,
      email: options.email,
    });
    if (!admin) {
      return null;
    }

    const adminForMail = admin.temporaryPassword
      ? admin
      : await issueFreshAdminCredentials(
          {
            id: admin.userId,
            email: admin.email,
            username: admin.username,
            firstName: admin.firstName,
            lastName: admin.lastName,
          },
          admin.email
        );

    try {
      await sendAccessInfoEmail(tenant, adminForMail, options.organizationName ?? tenant.name, false);
    } catch (err) {
      logger.error('Zugangs-Mail nach Mandanten-Anlage fehlgeschlagen', {
        tenantId: tenant.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return admin;
  },

  async resendAccessInfo(tenant: TenantRecord): Promise<{ email: string; adminCreated: boolean }> {
    await this.ensureClubSettings(tenant);
    const result = await deliverAccessInfo(tenant, {
      contactName: tenant.contactName,
      email: tenant.email,
      resent: true,
    });
    return { email: result.email, adminCreated: result.adminCreated };
  },
};
