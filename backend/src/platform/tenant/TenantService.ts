import type { TenantRepository } from '../../repositories/tenantRepository';
import type {
  CreateTenantInput,
  TenantContextData,
  TenantPublicData,
  TenantRecord,
  TenantSettingsRecord,
  UpdateTenantInput,
} from './types';
import { TenantArchivedError, TenantInactiveError, TenantNotFoundError } from './errors';

export class TenantService {
  constructor(private readonly repository: TenantRepository) {}

  async findById(id: string): Promise<TenantRecord | null> {
    return this.repository.findById(id);
  }

  async findBySlug(slug: string): Promise<TenantRecord | null> {
    return this.repository.findBySlug(slug);
  }

  async findBySubdomain(subdomain: string): Promise<TenantRecord | null> {
    return this.repository.findBySubdomain(subdomain);
  }

  async findByHost(host: string): Promise<TenantRecord | null> {
    return this.repository.findByHost(host);
  }

  async findAll(): Promise<TenantRecord[]> {
    return this.repository.findAll();
  }

  async exists(filter: { id?: string; slug?: string; subdomain?: string }): Promise<boolean> {
    return this.repository.exists(filter);
  }

  async create(input: CreateTenantInput): Promise<TenantRecord> {
    return this.repository.create(input);
  }

  async update(id: string, input: UpdateTenantInput): Promise<TenantRecord> {
    return this.repository.update(id, input);
  }

  async archive(id: string): Promise<TenantRecord> {
    return this.repository.archive(id);
  }

  async resolveContextData(tenant: TenantRecord): Promise<TenantContextData> {
    this.assertTenantAccessible(tenant);
    const settings = await this.getSettingsRecord(tenant.id);
    return this.toContextData(tenant, settings);
  }

  async getPublicData(tenant: TenantRecord): Promise<TenantPublicData> {
    this.assertTenantAccessible(tenant);
    const club = await this.getClubOrganizationSettings();
    return {
      name: club?.clubName ?? tenant.name,
      shortName: tenant.shortName,
      slug: tenant.slug,
      logoUrl: club?.logoUrl ?? tenant.logoUrl,
      description: club?.description ?? tenant.description,
      contactName: club?.contactName ?? tenant.contactName,
      email: club?.email ?? tenant.email,
      phone: club?.phone ?? tenant.phone,
      address: club?.address ?? tenant.address,
      website: club?.website ?? tenant.website,
      theme: tenant.theme,
      locale: tenant.locale,
      timezone: tenant.timezone,
      currency: tenant.currency,
    };
  }

  async getDefaultTenant(): Promise<TenantRecord> {
    const tenant = await this.repository.findBySlug('default');
    if (!tenant) {
      throw new TenantNotFoundError('Der Standard-Veranstalter ist nicht konfiguriert.');
    }
    return tenant;
  }

  assertTenantAccessible(tenant: TenantRecord): void {
    if (tenant.status === 'ARCHIVED' || tenant.archivedAt) {
      throw new TenantArchivedError();
    }
    if (tenant.status === 'SUSPENDED' || tenant.status === 'PENDING') {
      throw new TenantInactiveError();
    }
  }

  toContextData(tenant: TenantRecord, settings: TenantSettingsRecord): TenantContextData {
    return {
      id: tenant.id,
      name: tenant.name,
      shortName: tenant.shortName,
      slug: tenant.slug,
      subdomain: tenant.subdomain,
      status: tenant.status,
      locale: tenant.locale,
      timezone: tenant.timezone,
      currency: tenant.currency,
      theme: tenant.theme,
      logoUrl: tenant.logoUrl,
      contactName: tenant.contactName,
      email: tenant.email,
      phone: tenant.phone,
      description: tenant.description,
      address: tenant.address,
      website: tenant.website,
      settings,
    };
  }

  private async getClubOrganizationSettings(): Promise<{
    clubName: string;
    description: string | null;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    website: string | null;
    logoUrl: string | null;
  } | null> {
    try {
      const { clubRepository } = await import('../../repositories/clubRepository');
      const club = await clubRepository.get();
      return {
        clubName: club.clubName,
        description: club.description,
        contactName: club.contactName,
        email: club.email,
        phone: club.phone,
        address: club.address,
        website: club.website,
        logoUrl: club.logoUrl,
      };
    } catch {
      return null;
    }
  }

  private async getSettingsRecord(tenantId: string): Promise<TenantSettingsRecord> {
    const row = await this.repository.ensureSettings(tenantId);
    return {
      orderFieldFirstNameRequired: row.orderFieldFirstNameRequired,
      orderFieldLastNameRequired: row.orderFieldLastNameRequired,
      orderFieldEmailRequired: row.orderFieldEmailRequired,
      orderFieldPhoneRequired: row.orderFieldPhoneRequired,
      cancellationDeadlineHours: row.cancellationDeadlineHours,
      cancellationDeadlineUnit: row.cancellationDeadlineUnit,
      dataRetentionDays: row.dataRetentionDays,
    };
  }
}

export function mapClubSettingsToTenantInput(club: {
  clubName: string;
  description?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  logoUrl?: string | null;
}): CreateTenantInput {
  return {
    name: club.clubName,
    shortName: club.clubName,
    slug: 'default',
    subdomain: 'default',
    status: 'ACTIVE',
    contactName: club.contactName ?? undefined,
    email: club.email ?? undefined,
    phone: club.phone ?? undefined,
    description: club.description ?? undefined,
    address: club.address ?? undefined,
    website: club.website ?? undefined,
    logoUrl: club.logoUrl ?? undefined,
  };
}
