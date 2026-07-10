import { prisma } from '../config/database';
import { requireTenantId } from '../platform/tenant/tenantScope';
import { mailService } from '../platform/mail/MailService';
import { tenantContext } from '../platform/bootstrap';

export type OrganizationType =
  | 'verein'
  | 'feuerwehr'
  | 'hilfsorganisation'
  | 'schule'
  | 'kommune'
  | 'firma'
  | 'sonstige';

export interface SetupWizardData {
  organization?: {
    name?: string;
    type?: OrganizationType;
    logoUrl?: string;
    description?: string;
  };
  contact?: {
    address?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    phone?: string;
    email?: string;
    website?: string;
    socialMedia?: string;
  };
  legal?: {
    impressum?: string;
    privacy?: string;
    terms?: string;
    revocation?: string;
  };
  admin?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    locale?: string;
    timezone?: string;
  };
  event?: {
    name?: string;
    date?: string;
    description?: string;
    orderStartTime?: string;
    orderEndTime?: string;
    pickupStartTime?: string;
    pickupEndTime?: string;
    isPublic?: boolean;
    skipped?: boolean;
  };
}

interface SetupState {
  completed: boolean;
  completedAt?: string;
  currentStep: number;
  data: SetupWizardData;
}

function getSetupState(extraJson: unknown): SetupState {
  const root = (extraJson && typeof extraJson === 'object' ? extraJson : {}) as Record<string, unknown>;
  const initial = (root.initialSetup && typeof root.initialSetup === 'object'
    ? root.initialSetup
    : {}) as Record<string, unknown>;

  return {
    completed: Boolean(initial.completed),
    completedAt: typeof initial.completedAt === 'string' ? initial.completedAt : undefined,
    currentStep: typeof initial.currentStep === 'number' ? initial.currentStep : 0,
    data: (initial.data && typeof initial.data === 'object' ? initial.data : {}) as SetupWizardData,
  };
}

async function getTenantSettingsRow() {
  const tenantId = requireTenantId();
  return prisma.tenantSettings.upsert({
    where: { tenantId },
    update: {},
    create: { tenantId },
  });
}

export const tenantSetupService = {
  async getStatus(): Promise<SetupState> {
    const row = await getTenantSettingsRow();
    return getSetupState(row.extraJson);
  },

  async saveStep(step: number, data: SetupWizardData): Promise<SetupState> {
    const row = await getTenantSettingsRow();
    const current = getSetupState(row.extraJson);
    const merged: SetupState = {
      ...current,
      currentStep: step,
      data: { ...current.data, ...data },
    };

    const extraJson = {
      ...(row.extraJson as Record<string, unknown>),
      initialSetup: merged,
    };

    await prisma.tenantSettings.update({
      where: { tenantId: row.tenantId },
      data: { extraJson },
    });

    return merged;
  },

  async complete(data: SetupWizardData, adminUserId: string): Promise<SetupState> {
    const tenantId = requireTenantId();
    const row = await getTenantSettingsRow();
    const current = getSetupState(row.extraJson);
    const finalData = { ...current.data, ...data };

    if (finalData.organization?.name) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          name: finalData.organization.name,
          description: finalData.organization.description ?? undefined,
          logoUrl: finalData.organization.logoUrl ?? undefined,
        },
      });
      await prisma.clubSettings.updateMany({
        where: { tenantId },
        data: {
          clubName: finalData.organization.name,
          description: finalData.organization.description ?? undefined,
          logoUrl: finalData.organization.logoUrl ?? undefined,
        },
      });
    }

    if (finalData.contact) {
      const address = [
        finalData.contact.address,
        [finalData.contact.postalCode, finalData.contact.city].filter(Boolean).join(' '),
        finalData.contact.country,
      ].filter(Boolean).join(', ');

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          address: address || undefined,
          phone: finalData.contact.phone ?? undefined,
          email: finalData.contact.email ?? undefined,
          website: finalData.contact.website ?? undefined,
        },
      });
      await prisma.clubSettings.updateMany({
        where: { tenantId },
        data: {
          address: address || undefined,
          phone: finalData.contact.phone ?? undefined,
          email: finalData.contact.email ?? undefined,
          website: finalData.contact.website ?? undefined,
        },
      });
    }

    if (finalData.admin) {
      await prisma.user.update({
        where: { id: adminUserId },
        data: {
          firstName: finalData.admin.firstName ?? undefined,
          lastName: finalData.admin.lastName ?? undefined,
          email: finalData.admin.email ?? undefined,
        },
      });
      if (finalData.admin.locale || finalData.admin.timezone) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            locale: finalData.admin.locale ?? undefined,
            timezone: finalData.admin.timezone ?? undefined,
          },
        });
      }
    }

    if (finalData.event && !finalData.event.skipped && finalData.event.name && finalData.event.date) {
      const existing = await prisma.event.findFirst({
        where: { tenantId, name: finalData.event.name },
      });
      if (!existing) {
        await prisma.event.create({
          data: {
            tenantId,
            name: finalData.event.name,
            description: finalData.event.description,
            date: new Date(finalData.event.date),
            startTime: finalData.event.orderStartTime ?? '11:00',
            endTime: finalData.event.orderEndTime ?? '22:00',
            onlineOrdersActive: finalData.event.isPublic !== false,
            cashierActive: true,
            isActive: true,
          },
        });
      }
    }

    const orgType = finalData.organization?.type;
    const completed: SetupState = {
      completed: true,
      completedAt: new Date().toISOString(),
      currentStep: 7,
      data: { ...finalData, organization: { ...finalData.organization, type: orgType } },
    };

    const extraJson = {
      ...(row.extraJson as Record<string, unknown>),
      initialSetup: completed,
      organizationType: orgType,
      socialMedia: finalData.contact?.socialMedia,
    };

    await prisma.tenantSettings.update({
      where: { tenantId },
      data: { extraJson },
    });

    const tenant = tenantContext.current();
    const admin = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (admin?.email) {
      await mailService.sendTemplate('initial-setup', admin.email, {
        tenantName: finalData.organization?.name ?? tenant?.name,
        recipientName: admin.firstName,
      }, tenantId);
    }

    return completed;
  },

  async reset(): Promise<SetupState> {
    const row = await getTenantSettingsRow();
    const reset: SetupState = { completed: false, currentStep: 0, data: {} };
    const extraJson = {
      ...(row.extraJson as Record<string, unknown>),
      initialSetup: reset,
    };
    await prisma.tenantSettings.update({
      where: { tenantId: row.tenantId },
      data: { extraJson },
    });
    return reset;
  },
};
