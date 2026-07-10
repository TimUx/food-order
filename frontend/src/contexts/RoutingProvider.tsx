import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { RoutingConfig } from '@/types/routing';
import { DEFAULT_ROUTING } from '@/types/routing';
import { fetchRoutingConfig } from '@/services/routingConfig';

interface RoutingContextType {
  routing: RoutingConfig;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const RoutingContext = createContext<RoutingContextType | null>(null);

export function RoutingProvider({ children }: { children: ReactNode }) {
  const [routing, setRouting] = useState<RoutingConfig>(DEFAULT_ROUTING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const config = await fetchRoutingConfig();
      setRouting(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Routing konnte nicht geladen werden');
      setRouting(DEFAULT_ROUTING);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  return (
    <RoutingContext.Provider value={{ routing, loading, error, reload }}>
      {children}
    </RoutingContext.Provider>
  );
}

export function useRouting() {
  const ctx = useContext(RoutingContext);
  if (!ctx) throw new Error('useRouting muss innerhalb von RoutingProvider verwendet werden');
  return ctx;
}
