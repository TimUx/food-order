import { tenantContext, platformContext } from '../../../src/platform/bootstrap';
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

  if (ctx?.slug) {
    return platformDomainService.buildTenantUrl(domains, ctx.slug, '', proto);
  }

  if (isLocalPlatformDomain(domains.platformDomain)) {
    return platformDomainService.buildAppUrl(domains, '', proto);
  }

  return platformDomainService.buildAppUrl(domains, '', proto);
}
