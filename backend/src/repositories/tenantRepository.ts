import { prisma } from '../config/database';
import type {
  CreateTenantInput,
  TenantRecord,
  UpdateTenantInput,
} from '../platform/tenant/types';

const tenantSelect = {
  id: true,
  name: true,
  shortName: true,
  slug: true,
  subdomain: true,
  status: true,
  contactName: true,
  email: true,
  phone: true,
  logoUrl: true,
  locale: true,
  timezone: true,
  currency: true,
  theme: true,
  description: true,
  address: true,
  website: true,
  activatedAt: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

type TenantClient = {
  findUnique: (args: unknown) => Promise<TenantRecord | null>;
  findMany: (args: unknown) => Promise<TenantRecord[]>;
  count: (args: unknown) => Promise<number>;
  create: (args: unknown) => Promise<TenantRecord>;
  update: (args: unknown) => Promise<TenantRecord>;
};

type TenantSettingsClient = {
  findUnique: (args: unknown) => Promise<{
    orderFieldFirstNameRequired: boolean;
    orderFieldLastNameRequired: boolean;
    orderFieldEmailRequired: boolean;
    orderFieldPhoneRequired: boolean;
    cancellationDeadlineHours: number;
    dataRetentionDays: number;
  } | null>;
  upsert: (args: unknown) => Promise<{
    orderFieldFirstNameRequired: boolean;
    orderFieldLastNameRequired: boolean;
    orderFieldEmailRequired: boolean;
    orderFieldPhoneRequired: boolean;
    cancellationDeadlineHours: number;
    dataRetentionDays: number;
  }>;
};

function tenants(): TenantClient {
  return (prisma as unknown as { tenant: TenantClient }).tenant;
}

function tenantSettings(): TenantSettingsClient {
  return (prisma as unknown as { tenantSettings: TenantSettingsClient }).tenantSettings;
}

export class TenantRepository {
  async findById(id: string): Promise<TenantRecord | null> {
    return tenants().findUnique({ where: { id }, select: tenantSelect });
  }

  async findBySlug(slug: string): Promise<TenantRecord | null> {
    return tenants().findUnique({ where: { slug }, select: tenantSelect });
  }

  async findBySubdomain(subdomain: string): Promise<TenantRecord | null> {
    return tenants().findUnique({ where: { subdomain }, select: tenantSelect });
  }

  async findByHost(host: string): Promise<TenantRecord | null> {
    const normalized = host.toLowerCase().split(':')[0];
    const subdomain = this.extractSubdomain(normalized);
    if (!subdomain) return null;
    return this.findBySubdomain(subdomain);
  }

  async findAll(): Promise<TenantRecord[]> {
    return tenants().findMany({
      select: tenantSelect,
      orderBy: { name: 'asc' },
    });
  }

  async exists(filter: { id?: string; slug?: string; subdomain?: string }): Promise<boolean> {
    const count = await tenants().count({ where: filter });
    return count > 0;
  }

  async create(input: CreateTenantInput): Promise<TenantRecord> {
    const now = new Date();
    const status = input.status ?? 'ACTIVE';
    return tenants().create({
      data: {
        name: input.name,
        shortName: input.shortName ?? null,
        slug: input.slug,
        subdomain: input.subdomain,
        status,
        contactName: input.contactName ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        logoUrl: input.logoUrl ?? null,
        locale: input.locale ?? 'de-DE',
        timezone: input.timezone ?? 'Europe/Berlin',
        currency: input.currency ?? 'EUR',
        theme: input.theme ?? 'default',
        description: input.description ?? null,
        address: input.address ?? null,
        website: input.website ?? null,
        activatedAt: status === 'ACTIVE' ? now : null,
        settings: {
          create: {},
        },
      },
      select: tenantSelect,
    });
  }

  async update(id: string, input: UpdateTenantInput): Promise<TenantRecord> {
    return tenants().update({
      where: { id },
      data: input,
      select: tenantSelect,
    });
  }

  async archive(id: string): Promise<TenantRecord> {
    return tenants().update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
      select: tenantSelect,
    });
  }

  async getSettings(tenantId: string) {
    return tenantSettings().findUnique({ where: { tenantId } });
  }

  async ensureSettings(tenantId: string) {
    return tenantSettings().upsert({
      where: { tenantId },
      update: {},
      create: { tenantId },
    });
  }

  private extractSubdomain(host: string): string | null {
    if (!host.includes('.')) return host === 'localhost' ? 'default' : null;
    const parts = host.split('.');
    if (parts.length < 2) return null;
    return parts[0] || null;
  }
}
