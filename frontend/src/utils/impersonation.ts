import { writeScopedItem, removeScopedItem } from '@/utils/storageScope';
import {
  platformApi,
  PLATFORM_TOKEN_KEY,
  PLATFORM_REFRESH_KEY,
  PLATFORM_SESSION_BACKUP_KEY,
  IMPERSONATION_META_KEY,
} from '@/services/platformApi';

const TOKEN_BASE = 'verein_token';
const REFRESH_BASE = 'verein_refresh_token';

export async function startTenantImpersonation(platformAuthToken: string, tenantId: string): Promise<void> {
  const platformToken = localStorage.getItem(PLATFORM_TOKEN_KEY);
  const platformRefresh = localStorage.getItem(PLATFORM_REFRESH_KEY);
  const result = await platformApi.impersonate(platformAuthToken, tenantId);

  localStorage.setItem(
    PLATFORM_SESSION_BACKUP_KEY,
    JSON.stringify({ platformToken, platformRefresh })
  );
  localStorage.setItem(
    IMPERSONATION_META_KEY,
    JSON.stringify({
      ...result.tenant,
      platformSessionId: result.impersonation.platformSessionId,
    })
  );

  writeScopedItem(TOKEN_BASE, 'tenant', result.tenant.slug, result.token);
  removeScopedItem(REFRESH_BASE, 'tenant', result.tenant.slug);

  window.location.assign(result.redirectTo);
}

export function clearTenantImpersonationTokens(tenantSlug?: string | null): void {
  if (tenantSlug) {
    removeScopedItem(TOKEN_BASE, 'tenant', tenantSlug);
    removeScopedItem(REFRESH_BASE, 'tenant', tenantSlug);
    return;
  }
  removeScopedItem(TOKEN_BASE, 'tenant', null);
  removeScopedItem(REFRESH_BASE, 'tenant', null);
}
