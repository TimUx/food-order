import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { moduleRegistry } from './ModuleRegistry';
import type { ModuleInfo } from './types';
import { useAuth } from '@/contexts/AuthContext';

export function useModules() {
  const { token } = useAuth();
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await api.getModules(token);
      setModules(data);
      moduleRegistry.setMenuItems(
        data.filter((m) => m.status === 'ACTIVATED').flatMap((m) => m.menuItems)
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const runAction = async (id: string, action: (t: string, i: string) => Promise<unknown>) => {
    if (!token) return;
    await action(token, id);
    await load();
  };

  return {
    modules,
    loading,
    error,
    reload: load,
    installModule: (id: string) => runAction(id, api.installModule),
    uninstallModule: (id: string) => runAction(id, api.uninstallModule),
    activateModule: (id: string) => runAction(id, api.activateModule),
    deactivateModule: (id: string) => runAction(id, api.deactivateModule),
    reinitializeModule: (id: string) => runAction(id, api.reinitializeModule),
    healthCheck: (id: string) => runAction(id, api.runModuleHealthCheck),
  };
}

export function useModuleMenuItems() {
  const [items, setItems] = useState(moduleRegistry.getMenuItems());

  useEffect(() => {
    api.getPublicModuleMenu().then((menuItems) => {
      moduleRegistry.setMenuItems(menuItems);
      setItems(moduleRegistry.getMenuItems());
    }).catch(() => {});
  }, []);

  return items;
}
