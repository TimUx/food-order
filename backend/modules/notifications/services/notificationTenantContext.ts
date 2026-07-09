import { tenantContext, platformContext } from '../../../src/platform/bootstrap';
import { config } from '../../../src/config';

/**
 * Ermittelt die öffentliche Basis-URL des aktuellen Mandanten (ohne Request-Parsing).
 * Wird in E-Mail-Templates und rechtlichen Links verwendet.
 */
export function resolveTenantPublicBaseUrl(): string {
  const ctx = tenantContext.current();
  const platform = platformContext.current();
  const baseDomain = platform?.baseDomain ?? config.multiTenant.baseDomain;
  const proto = config.nodeEnv === 'production' ? 'https' : 'http';

  if (ctx?.subdomain && baseDomain && baseDomain !== 'localhost') {
    return `${proto}://${ctx.subdomain}.${baseDomain}`;
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
