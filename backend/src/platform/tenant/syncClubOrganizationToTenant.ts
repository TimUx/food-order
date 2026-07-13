import { prisma } from '../../config/database';
import type { UpdateTenantInput } from './types';

const ORGANIZATION_FIELDS = [
  'clubName',
  'description',
  'contactName',
  'email',
  'phone',
  'address',
  'website',
  'logoUrl',
] as const;

export function mapClubValuesToTenantUpdate(
  club: Record<string, unknown>
): UpdateTenantInput {
  const update: UpdateTenantInput = {};

  if (club.clubName !== undefined) {
    update.name = String(club.clubName);
    update.shortName = String(club.clubName);
  }
  if (club.description !== undefined) {
    update.description = club.description as string | null;
  }
  if (club.contactName !== undefined) {
    update.contactName = club.contactName as string | null;
  }
  if (club.email !== undefined) {
    update.email = club.email as string | null;
  }
  if (club.phone !== undefined) {
    update.phone = club.phone as string | null;
  }
  if (club.address !== undefined) {
    update.address = club.address as string | null;
  }
  if (club.website !== undefined) {
    update.website = club.website as string | null;
  }
  if (club.logoUrl !== undefined) {
    update.logoUrl = club.logoUrl as string | null;
  }

  return update;
}

export function pickOrganizationFields(
  values: Record<string, unknown>
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of ORGANIZATION_FIELDS) {
    if (values[key] !== undefined) {
      picked[key] = values[key];
    }
  }
  return picked;
}

export async function syncClubOrganizationToTenant(
  tenantId: string,
  club: Record<string, unknown>
): Promise<void> {
  const update = mapClubValuesToTenantUpdate(club);
  if (Object.keys(update).length === 0) return;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: update,
  });
}
