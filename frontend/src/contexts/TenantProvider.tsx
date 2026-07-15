import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { TenantPublicData, DEFAULT_TENANT } from '@/types/tenant';
import type { ClubSettings } from '@/types/club';
import { api } from '@/services/api';
import { subscribeTenantUpdates } from '@/services/realtime/channels';
import { useRouting } from '@/contexts/RoutingProvider';
import { realtimeService } from '@/services/realtime';

function mergeTenantWithClub(tenantData: TenantPublicData, clubData: ClubSettings | null): TenantPublicData {
  if (!clubData) return { ...DEFAULT_TENANT, ...tenantData };
  return {
    ...DEFAULT_TENANT,
    ...tenantData,
    name: clubData.clubName || tenantData.name,
    logoUrl: clubData.logoUrl ?? tenantData.logoUrl ?? null,
    description: clubData.description ?? tenantData.description ?? null,
    contactName: clubData.contactName ?? tenantData.contactName ?? null,
    email: clubData.email ?? tenantData.email ?? null,
    phone: clubData.phone ?? tenantData.phone ?? null,
    address: clubData.address ?? tenantData.address ?? null,
    website: clubData.website ?? tenantData.website ?? null,
  };
}

interface TenantContextType {
  tenant: TenantPublicData;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { routing } = useRouting();
  const [tenant, setTenant] = useState<TenantPublicData>(DEFAULT_TENANT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (routing.scope !== 'tenant') {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const [tenantData, clubData] = await Promise.all([
        api.getTenant(),
        api.getClub().catch(() => null),
      ]);
      setTenant(mergeTenantWithClub(tenantData, clubData));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veranstalter konnte nicht geladen werden');
      setTenant(DEFAULT_TENANT);
    }
  }, [routing.scope]);

  useEffect(() => {
    if (routing.scope !== 'tenant') {
      setLoading(false);
      return;
    }

    setLoading(true);
    void refresh().finally(() => setLoading(false));

    realtimeService.disconnect();
    realtimeService.configureAuth(null, routing.tenantSlug);
    realtimeService.connect();

    const unsub = subscribeTenantUpdates((data) => {
      void api.getClub()
        .then((clubData) => setTenant(mergeTenantWithClub(data, clubData)))
        .catch(() => setTenant((prev) => ({ ...prev, ...data })));
    });

    return () => {
      unsub();
      realtimeService.disconnect();
    };
  }, [routing.scope, routing.tenantSlug]);

  return (
    <TenantContext.Provider value={{ tenant, loading, error, refresh }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant muss innerhalb von TenantProvider verwendet werden');
  return ctx;
}
