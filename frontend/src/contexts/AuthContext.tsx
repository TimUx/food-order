import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '@/types';
import { api, configureAuthRefresh } from '@/services/api';
import { useRouting } from '@/contexts/RoutingProvider';
import { readScopedItem, writeScopedItem, removeScopedItem } from '@/utils/storageScope';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  setSession: (token: string, refreshToken: string | undefined, user: User) => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_BASE = 'verein_token';
const REFRESH_BASE = 'verein_refresh_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { routing } = useRouting();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => readScopedItem(TOKEN_BASE, routing.scope, routing.tenantSlug));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setToken(readScopedItem(TOKEN_BASE, routing.scope, routing.tenantSlug));
    setUser(null);
    setLoading(true);
  }, [routing.scope, routing.tenantSlug]);

  useEffect(() => {
    configureAuthRefresh({
      getRefreshToken: () => readScopedItem(REFRESH_BASE, routing.scope, routing.tenantSlug),
      onTokensRefreshed: (accessToken, refreshToken) => {
        writeScopedItem(TOKEN_BASE, routing.scope, routing.tenantSlug, accessToken);
        if (refreshToken) {
          writeScopedItem(REFRESH_BASE, routing.scope, routing.tenantSlug, refreshToken);
        }
        setToken(accessToken);
      },
      onAuthFailed: () => {
        removeScopedItem(TOKEN_BASE, routing.scope, routing.tenantSlug);
        removeScopedItem(REFRESH_BASE, routing.scope, routing.tenantSlug);
        setToken(null);
        setUser(null);
      },
    });
  }, [routing.scope, routing.tenantSlug]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api.me(token)
      .then(setUser)
      .catch(() => {
        removeScopedItem(TOKEN_BASE, routing.scope, routing.tenantSlug);
        removeScopedItem(REFRESH_BASE, routing.scope, routing.tenantSlug);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token, routing.scope, routing.tenantSlug]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    writeScopedItem(TOKEN_BASE, routing.scope, routing.tenantSlug, result.token);
    if (result.refreshToken) {
      writeScopedItem(REFRESH_BASE, routing.scope, routing.tenantSlug, result.refreshToken);
    }
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }, [routing.scope, routing.tenantSlug]);

  const setSession = useCallback((accessToken: string, refreshToken: string | undefined, sessionUser: User) => {
    writeScopedItem(TOKEN_BASE, routing.scope, routing.tenantSlug, accessToken);
    if (refreshToken) {
      writeScopedItem(REFRESH_BASE, routing.scope, routing.tenantSlug, refreshToken);
    }
    setToken(accessToken);
    setUser(sessionUser);
  }, [routing.scope, routing.tenantSlug]);

  const logout = useCallback(() => {
    const refreshToken = readScopedItem(REFRESH_BASE, routing.scope, routing.tenantSlug);
    if (refreshToken) {
      void api.logout(refreshToken).catch(() => {});
    }
    removeScopedItem(TOKEN_BASE, routing.scope, routing.tenantSlug);
    removeScopedItem(REFRESH_BASE, routing.scope, routing.tenantSlug);
    setToken(null);
    setUser(null);
  }, [routing.scope, routing.tenantSlug]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        setSession,
        logout,
        isAdmin: user?.role === 'ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden');
  return ctx;
}
