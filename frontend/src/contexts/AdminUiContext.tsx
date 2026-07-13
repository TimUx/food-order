import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import type { AdminPageDefinition, AdminUiCatalog } from '@/types/adminUi';

interface AdminUiContextValue {
  catalog: AdminUiCatalog | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  findPageByPath: (path: string) => AdminPageDefinition | undefined;
}

const AdminUiContext = createContext<AdminUiContextValue | null>(null);

let cachedCatalog: AdminUiCatalog | null = null;
const listeners = new Set<() => void>();

export function invalidateAdminUiCache(): void {
  listeners.forEach((listener) => listener());
}

function normalizeAdminPath(path: string): string {
  return path.replace(/\/$/, '') || '/admin';
}

function findPageInCatalog(catalog: AdminUiCatalog, path: string): AdminPageDefinition | undefined {
  const normalized = normalizeAdminPath(path);
  const direct = catalog.pages.find((p) => normalizeAdminPath(p.path) === normalized);
  if (direct) return direct;

  const settingsMatch = normalized.match(/^\/admin\/settings\/(.+)$/);
  if (settingsMatch) {
    const namespace = decodeURIComponent(settingsMatch[1]);
    return catalog.pages.find((p) => p.namespace === namespace);
  }

  return undefined;
}

export function AdminUiProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [catalog, setCatalog] = useState<AdminUiCatalog | null>(cachedCatalog);
  const [loading, setLoading] = useState(!cachedCatalog);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    if (!token) return;
    const hasCatalog = Boolean(cachedCatalog);
    try {
      if (!hasCatalog) setLoading(true);
      const data = await api.getAdminUi(token);
      cachedCatalog = data;
      setCatalog(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin-Metadaten konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  useEffect(() => {
    const onInvalidate = () => setReloadToken((v) => v + 1);
    listeners.add(onInvalidate);
    return () => { listeners.delete(onInvalidate); };
  }, []);

  const findPageByPath = useCallback(
    (path: string) => (catalog ? findPageInCatalog(catalog, path) : undefined),
    [catalog]
  );

  const value = useMemo<AdminUiContextValue>(
    () => ({ catalog, loading, error, reload: load, findPageByPath }),
    [catalog, loading, error, load, findPageByPath]
  );

  return <AdminUiContext.Provider value={value}>{children}</AdminUiContext.Provider>;
}

export function useAdminUi(): AdminUiContextValue {
  const ctx = useContext(AdminUiContext);
  if (!ctx) {
    throw new Error('useAdminUi must be used within AdminUiProvider');
  }
  return ctx;
}
