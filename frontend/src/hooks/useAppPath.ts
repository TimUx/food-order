import { useCallback } from 'react';
import { useRouting } from '@/contexts/RoutingProvider';

/**
 * Baut eine absolute URL für externe Weiterleitungen (Impersonation, QR-Codes).
 * Interne Navigation nutzt React Router (basename wird automatisch angewendet).
 */
export function useAbsoluteUrl() {
  const { routing } = useRouting();

  return useCallback(
    (path: string) => {
      const normalized = path.startsWith('/') ? path : `/${path}`;
      if (routing.scope === 'tenant' && routing.tenantUrl) {
        return `${routing.tenantUrl}${normalized}`;
      }
      if (routing.scope === 'platform') {
        return `${routing.wwwUrl || routing.platformUrl}${normalized}`;
      }
      return `${routing.platformUrl}${normalized}`;
    },
    [routing]
  );
}
