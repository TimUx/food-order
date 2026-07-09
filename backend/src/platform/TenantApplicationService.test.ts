import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantApplicationService } from './TenantApplicationService';
import { AppError } from '../middleware/errorHandler';

vi.mock('../config/database', () => ({
  prisma: {
    tenant: { findFirst: vi.fn() },
    tenantApplication: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('./notifications/platformNotificationService', () => ({
  platformNotificationService: {
    notifyApplicationSubmitted: vi.fn(),
    notifyApplicantConfirmation: vi.fn(),
  },
}));

import { prisma } from '../config/database';

describe('TenantApplicationService', () => {
  const platformContext = {
    current: () => ({ registrationEnabled: true }),
  };
  const tenantAdmin = { create: vi.fn(), activate: vi.fn() };
  const audit = { log: vi.fn() };
  let service: TenantApplicationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TenantApplicationService(
      platformContext as never,
      tenantAdmin as never,
      audit as never
    );
  });

  it('rejects when registration is disabled', async () => {
    const disabled = new TenantApplicationService(
      { current: () => ({ registrationEnabled: false }) } as never,
      tenantAdmin as never,
      audit as never
    );
    await expect(
      disabled.submit({
        organization: 'Testverein',
        organizationType: 'Verein',
        contactName: 'Max',
        street: 'Hauptstr. 1',
        postalCode: '12345',
        city: 'Musterstadt',
        email: 'test@example.com',
        reason: 'Wir brauchen FestManager für unser Vereinsfest und die Küchenorganisation.',
        desiredFeatures: 'Bestellungen, Küche, Abholung',
        freeTierJustification: 'Gemeinnütziger Verein ohne Budget für kommerzielle Software.',
        plannedUsage: 'Einmal jährlich beim Sommerfest',
        requestedSubdomain: 'test-verein',
        privacyAccepted: true,
        termsAccepted: true,
      })
    ).rejects.toThrow(AppError);
  });

  it('normalizes subdomain on submit', async () => {
    vi.mocked(prisma.tenant.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.tenantApplication.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.tenantApplication.create).mockResolvedValue({
      id: 'app-1',
      organization: 'Test',
      organizationType: 'Verein',
      contactName: 'Max',
      street: 'S',
      postalCode: '1',
      city: 'C',
      country: 'Deutschland',
      email: 'a@b.de',
      phone: null,
      website: null,
      memberCount: null,
      eventsPerYear: null,
      reason: 'r',
      desiredFeatures: 'f',
      freeTierJustification: 'j',
      plannedUsage: 'p',
      notes: null,
      requestedSubdomain: 'mein-verein',
      status: 'NEW',
      adminComment: null,
      reviewedBy: null,
      reviewedAt: null,
      tenantId: null,
      privacyAccepted: true,
      termsAccepted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.submit({
      organization: 'Testverein',
      organizationType: 'Verein',
      contactName: 'Max',
      street: 'Hauptstr. 1',
      postalCode: '12345',
      city: 'Musterstadt',
      email: 'test@example.com',
      reason: 'Wir brauchen FestManager für unser Vereinsfest und die Küchenorganisation.',
      desiredFeatures: 'Bestellungen, Küche, Abholung',
      freeTierJustification: 'Gemeinnütziger Verein ohne Budget für kommerzielle Software.',
      plannedUsage: 'Einmal jährlich beim Sommerfest',
      requestedSubdomain: 'Mein_Verein!',
      privacyAccepted: true,
      termsAccepted: true,
    });

    expect(prisma.tenantApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requestedSubdomain: 'mein-verein' }),
      })
    );
  });
});
