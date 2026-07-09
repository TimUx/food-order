import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ClubSettings, DEFAULT_CLUB } from '@/types/club';
import { api } from '@/services/api';
import { subscribeClubUpdates } from '@/services/realtime/channels';

interface ClubContextType {
  club: ClubSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ClubContext = createContext<ClubContextType | null>(null);

export function ClubProvider({ children }: { children: ReactNode }) {
  const [club, setClub] = useState<ClubSettings>(DEFAULT_CLUB);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await api.getClub();
      setClub({ ...DEFAULT_CLUB, ...data });
    } catch {
      setClub(DEFAULT_CLUB);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const unsub = subscribeClubUpdates((data) => {
      setClub({ ...DEFAULT_CLUB, ...data });
    });
    return unsub;
  }, []);

  return (
    <ClubContext.Provider value={{ club, loading, refresh }}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error('useClub muss innerhalb von ClubProvider verwendet werden');
  return ctx;
}
