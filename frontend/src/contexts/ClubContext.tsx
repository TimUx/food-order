import { ClubSettings, DEFAULT_CLUB } from '@/types/club';
import { useTenant } from '@/contexts/TenantProvider';

function mapTenantToClub(tenant: ReturnType<typeof useTenant>['tenant']): ClubSettings {
  return {
    ...DEFAULT_CLUB,
    clubName: tenant.name,
    description: tenant.description ?? undefined,
    contactName: tenant.contactName ?? undefined,
    email: tenant.email ?? undefined,
    phone: tenant.phone ?? undefined,
    address: tenant.address ?? undefined,
    website: tenant.website ?? undefined,
    logoUrl: tenant.logoUrl,
  };
}

export function useClub() {
  const tenantCtx = useTenant();
  return {
    club: mapTenantToClub(tenantCtx.tenant),
    loading: tenantCtx.loading,
    refresh: tenantCtx.refresh,
  };
}
