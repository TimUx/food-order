import type { RoutingConfig } from '@/types/routing';
import { DEFAULT_ROUTING } from '@/types/routing';

const API_URL = import.meta.env.VITE_API_URL || '';

export async function fetchRoutingConfig(): Promise<RoutingConfig> {
  const frontendPath =
    typeof window !== 'undefined' ? window.location.pathname : '/';
  const params = new URLSearchParams({ frontendPath });
  const url = `${API_URL}/api/public/routing-config?${params}`;
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error('Routing-Konfiguration konnte nicht geladen werden');
  }
  const data = (await res.json()) as RoutingConfig;
  return { ...DEFAULT_ROUTING, ...data };
}
