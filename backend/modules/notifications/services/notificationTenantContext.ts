import { tenantContext, platformContext } from '../../../src/platform/bootstrap';
import { config } from '../../../src/config';
import { platformDomainService, isLocalPlatformDomain } from '../../../src/platform/PlatformDomainService';

/**
 * Ermittelt die öffentliche Basis-URL des aktuellen Mandanten (ohne Request-Parsing).
 * Wird in E-Mail-Templates und rechtlichen Links verwendet.
 */
export function resolveTenantPublicBaseUrl(): string {
  const ctx = tenantContext.current();
  const platform = platformContext.current();
  const domains = platformDomainService.getPublicView(platform);
  const proto = platformDomainService.resolveProto();

  if (ctx?.subdomain && !isLocalPlatformDomain(domains.platformDomain)) {
    return platformDomainService.buildTenantUrl(domains, ctx.subdomain, '', proto);
  }

  if (ctx?.slug && platform?.pathPrefixRoutingEnabled) {
    const origin = config.corsOrigin.replace(/\/$/, '');
    return `${origin}/${ctx.slug}`;
  }

  return config.corsOrigin.replace(/\/$/, '');
}

export function resolveTenantBrandingDefaults(): {
  locale: string;
  timezone: string;
  logoUrl: string | null;
  name: string;
} {
  const ctx = tenantContext.current();
  return {
    locale: ctx?.locale ?? 'de-DE',
    timezone: ctx?.timezone ?? 'Europe/Berlin',
    logoUrl: ctx?.logoUrl ?? null,
    name: ctx?.name ?? 'Veranstalter',
  };
}
