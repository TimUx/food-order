import { tenantContext, platformContext } from '../../../src/platform/bootstrap';
import { platformDomainService, isLocalPlatformDomain } from '../../../src/platform/PlatformDomainService';

export type TenantBrandingDefaults = {
  logoUrl: string | null;
};

/**
 * Mandanten-Standardwerte für E-Mail-Branding (z. B. Logo aus Tenant-Kontext).
 */
export function resolveTenantBrandingDefaults(): TenantBrandingDefaults {
  const ctx = tenantContext.current();
  return {
    logoUrl: ctx?.logoUrl ?? null,
  };
}

/**
 * Ermittelt die öffentliche Basis-URL des aktuellen Mandanten (ohne Request-Parsing).
 * Wird in E-Mail-Templates und rechtlichen Links verwendet.
 */
export function resolveTenantPublicBaseUrl(): string {
  const ctx = tenantContext.current();
  const platform = platformContext.current();
  const domains = platformDomainService.getPublicView(platform);
  const proto: 'http' | 'https' = isLocalPlatformDomain(domains.platformDomain) ? 'http' : 'https';

  if (ctx?.slug) {
    return platformDomainService.buildTenantUrl(domains, ctx.slug, '', proto);
  }

  return platformDomainService.buildAppUrl(domains, '', proto);
}
