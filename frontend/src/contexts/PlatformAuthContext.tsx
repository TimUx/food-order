import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  platformApi,
  PLATFORM_TOKEN_KEY,
  PLATFORM_REFRESH_KEY,
  type PlatformUser,
} from '@/services/platformApi';

interface PlatformAuthContextType {
  user: PlatformUser | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<PlatformUser>;
  setSession: (token: string, refreshToken: string | undefined, user: PlatformUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const PlatformAuthContext = createContext<PlatformAuthContextType | null>(null);

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(PLATFORM_TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    platformApi.me(token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(PLATFORM_TOKEN_KEY);
        localStorage.removeItem(PLATFORM_REFRESH_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(async (identifier: string, password: string) => {
    const result = await platformApi.login(identifier, password);
    localStorage.setItem(PLATFORM_TOKEN_KEY, result.token);
    if (result.refreshToken) {
      localStorage.setItem(PLATFORM_REFRESH_KEY, result.refreshToken);
    }
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const setSession = useCallback((accessToken: string, refreshToken: string | undefined, sessionUser: PlatformUser) => {
    localStorage.setItem(PLATFORM_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(PLATFORM_REFRESH_KEY, refreshToken);
    }
    setToken(accessToken);
    setUser(sessionUser);
  }, []);

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem(PLATFORM_REFRESH_KEY);
    if (refreshToken) {
      void platformApi.logout(refreshToken).catch(() => {});
    }
    localStorage.removeItem(PLATFORM_TOKEN_KEY);
    localStorage.removeItem(PLATFORM_REFRESH_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem(PLATFORM_TOKEN_KEY);
    if (!currentToken) return;
    const me = await platformApi.me(currentToken);
    setUser(me);
  }, []);

  return (
    <PlatformAuthContext.Provider value={{ user, token, loading, login, setSession, logout, refreshUser }}>
      {children}
    </PlatformAuthContext.Provider>
  );
}

export function usePlatformAuth() {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) throw new Error('usePlatformAuth requires PlatformAuthProvider');
  return ctx;
}
