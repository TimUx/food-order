import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tenantOnboardingService } from './TenantOnboardingService';

vi.mock('../config/database', () => ({
  prisma: {
    clubSettings: { upsert: vi.fn() },
    user: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    role: { upsert: vi.fn() },
  },
}));

vi.mock('../services/sessionService', () => ({
  sessionService: { revokeAllUserSessions: vi.fn() },
}));

vi.mock('./notifications/platformNotificationService', () => ({
  platformNotificationService: {
    notifyTenantApproved: vi.fn(),
  },
}));

vi.mock('./PlatformDomainService', () => ({
  platformDomainService: {
    getPublicView: () => ({ platformDomain: 'localhost' }),
    resolveProto: () => 'http',
    buildTenantUrl: (_d: unknown, slug: string, path: string) => `http://localhost:5173/${slug}${path}`,
  },
}));

import { prisma } from '../config/database';
import { platformNotificationService } from './notifications/platformNotificationService';
import { sessionService } from '../services/sessionService';

describe('tenantOnboardingService', () => {
  const tenant = {
    id: 'tenant-1',
    name: 'Testverein',
    shortName: 'TV',
    slug: 'test-verein',
    subdomain: 'test-verein',
    status: 'ACTIVE' as const,
    contactName: 'Max Mustermann',
    email: 'max@verein.test',
    phone: null,
    logoUrl: null,
    locale: 'de-DE',
    timezone: 'Europe/Berlin',
    currency: 'EUR',
    theme: 'default',
    description: null,
    address: null,
    website: null,
    activatedAt: new Date(),
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.role.upsert).mockResolvedValue({ id: 'role-admin', name: 'ADMIN', permissions: [] } as never);
    vi.mocked(prisma.clubSettings.upsert).mockResolvedValue({} as never);
    vi.mocked(platformNotificationService.notifyTenantApproved).mockResolvedValue(undefined);
  });

  it('creates admin and sends approval mail for new tenant', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'user-1',
      email: 'max@verein.test',
      username: null,
      firstName: 'Max',
      lastName: 'Mustermann',
    } as never);

    const result = await tenantOnboardingService.onboardNewTenant(tenant, {
      contactName: 'Max Mustermann',
      email: 'max@verein.test',
      organizationName: 'Testverein',
    });

    expect(result?.created).toBe(true);
    expect(result?.temporaryPassword).toHaveLength(16);
    expect(prisma.user.create).toHaveBeenCalled();
    expect(platformNotificationService.notifyTenantApproved).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationName: 'Testverein',
        adminUrl: 'http://localhost:5173/test-verein/admin/login',
        publicUrl: 'http://localhost:5173/test-verein/public',
        resent: false,
      })
    );
  });

  it('resets password and sends mail when admin already exists', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'existing',
      email: 'max@verein.test',
      username: null,
      firstName: 'Max',
      lastName: 'Mustermann',
      active: true,
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const result = await tenantOnboardingService.onboardNewTenant(tenant);

    expect(result?.created).toBe(false);
    expect(prisma.user.update).toHaveBeenCalled();
    expect(sessionService.revokeAllUserSessions).toHaveBeenCalledWith('existing');
    expect(platformNotificationService.notifyTenantApproved).toHaveBeenCalledWith(
      expect.objectContaining({ resent: false })
    );
  });

  it('creates admin even when mail delivery fails', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'user-1',
      email: 'max@verein.test',
      username: null,
      firstName: 'Max',
      lastName: 'Mustermann',
    } as never);
    vi.mocked(platformNotificationService.notifyTenantApproved).mockRejectedValueOnce(
      new Error('SMTP nicht konfiguriert')
    );

    const result = await tenantOnboardingService.onboardNewTenant(tenant, {
      email: 'max@verein.test',
    });

    expect(result?.userId).toBe('user-1');
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('resends access info with new password for existing admin', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'existing',
      email: 'max@verein.test',
      username: null,
      firstName: 'Max',
      lastName: 'Mustermann',
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const result = await tenantOnboardingService.resendAccessInfo(tenant);

    expect(result.email).toBe('max@verein.test');
    expect(result.adminCreated).toBe(false);
    expect(prisma.user.update).toHaveBeenCalled();
    expect(platformNotificationService.notifyTenantApproved).toHaveBeenCalledWith(
      expect.objectContaining({ resent: true })
    );
  });
});
