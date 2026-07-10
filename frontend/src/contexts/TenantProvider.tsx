import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TenantPublicData, DEFAULT_TENANT } from '@/types/tenant';
import { api } from '@/services/api';
import { subscribeTenantUpdates } from '@/services/realtime/channels';
import { useRouting } from '@/contexts/RoutingProvider';
import { realtimeService } from '@/services/realtime';

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

  const refresh = async () => {
    if (routing.scope !== 'tenant') {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const data = await api.getTenant();
      setTenant({ ...DEFAULT_TENANT, ...data });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veranstalter konnte nicht geladen werden');
      setTenant(DEFAULT_TENANT);
    }
  };

  useEffect(() => {
    if (routing.scope !== 'tenant') {
      setLoading(false);
      return;
    }

    setLoading(true);
    void refresh().finally(() => setLoading(false));

    realtimeService.disconnect();
    realtimeService.connect();

    const unsub = subscribeTenantUpdates((data) => {
      setTenant((prev) => ({ ...prev, ...data }));
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
