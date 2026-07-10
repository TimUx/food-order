import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PlatformPublicData, DEFAULT_PLATFORM } from '@/types/tenant';
import { api } from '@/services/api';

interface PlatformContextType {
  platform: PlatformPublicData;
  loading: boolean;
  refresh: () => Promise<void>;
}

const PlatformContext = createContext<PlatformContextType | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [platform, setPlatform] = useState<PlatformPublicData>(DEFAULT_PLATFORM);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await api.getPlatform();
      setPlatform({ ...DEFAULT_PLATFORM, ...data });
    } catch {
      setPlatform(DEFAULT_PLATFORM);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  return (
    <PlatformContext.Provider value={{ platform, loading, refresh }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform muss innerhalb von PlatformProvider verwendet werden');
  return ctx;
}
