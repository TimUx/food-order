import type { Request, Response, NextFunction } from 'express';
import type { TenantService } from '../platform/tenant/TenantService';
import type { TenantContext } from '../platform/tenant/TenantContext';
import type { PlatformContext } from '../platform/tenant/PlatformContext';
import type { TenantResolver } from '../platform/tenant/TenantResolver';
import type { ResolveResult, PlatformContextData } from '../platform/tenant/types';
import { DEFAULT_PLATFORM_CONTEXT } from '../platform/tenant/types';
import { TenantNotFoundError } from '../platform/tenant/errors';
import { platformDomainService } from '../platform/PlatformDomainService';

export function createTenantController(
  tenantService: TenantService,
  tenantContext: TenantContext,
  platformContext: PlatformContext,
  tenantResolver: TenantResolver
) {
  function currentPlatform(): PlatformContextData {
    return platformContext.current() ?? DEFAULT_PLATFORM_CONTEXT;
  }

  function buildRoutingUrls(
    req: Request,
    platform: PlatformContextData,
    result: ResolveResult | null
  ) {
    const proto = platformDomainService.resolveProto(req);
    const domains = platformDomainService.getPublicView(platform);

    const wwwUrl = platformDomainService.buildWwwUrl(domains, '', proto);
    const appUrl = platformDomainService.buildAppUrl(domains, '', proto);
    const tenantSlug = result?.tenant?.slug ?? null;
    const apiUrl = platformDomainService.buildApiUrl(domains, '/api', proto, tenantSlug);

    let tenantUrl: string | null = null;
    if (result?.tenant) {
      tenantUrl = platformDomainService.buildTenantUrl(domains, result.tenant.slug, '', proto);
    }

    const apiBasePath = tenantSlug ? `/${tenantSlug}/api` : '/api';

    return {
      wwwUrl,
      appUrl,
      platformUrl: appUrl,
      apiUrl,
      apiBasePath,
      tenantUrl,
      domains: {
        platformDomain: domains.platformDomain,
        baseDomain: domains.platformDomain,
        wwwSubdomain: domains.wwwSubdomain,
        wwwDomain: domains.wwwDomain,
        appSubdomain: domains.appSubdomain,
        appDomain: domains.appDomain,
        apiSubdomain: domains.apiSubdomain,
        apiDomain: domains.apiDomain,
        docsSubdomain: domains.docsSubdomain,
        docsDomain: domains.docsDomain,
        statusSubdomain: domains.statusSubdomain,
        statusDomain: domains.statusDomain,
        wildcardDomain: domains.wildcardDomain,
        tenantDomainPattern: domains.tenantDomainPattern,
        cookieDomain: domains.cookieDomain,
        sessionDomain: domains.sessionDomain,
        reservedSubdomains: domains.reservedSubdomains,
        source: domains.source,
      },
    };
  }

  return {
    async getPublic(_req: unknown, res: Response, next: NextFunction) {
      try {
        const ctx = tenantContext.require();
        const tenant = await tenantService.findById(ctx.id);
        if (!tenant) {
          res.status(404).json({ error: 'Der angeforderte Veranstalter wurde nicht gefunden.' });
          return;
        }
        const data = await tenantService.getPublicData(tenant);
        res.json(data);
      } catch (error) {
        next(error);
      }
    },

    async getPlatformPublic(_req: unknown, res: Response, next: NextFunction) {
      try {
        const platform = currentPlatform();
        const domains = platformDomainService.getPublicView(platform);
        res.json({
          name: platform.platformName,
          version: platform.platformVersion,
          baseDomain: platform.baseDomain,
          wwwDomain: domains.wwwDomain,
          appDomain: domains.appDomain,
          domains,
          maintenanceMode: platform.maintenanceMode,
          maintenanceMessage: platform.maintenanceMessage ?? null,
          primaryColor: '#1565c0',
          defaultLocale: platform.defaultLocale,
        });
      } catch (error) {
        next(error);
      }
    },

    async getRoutingConfig(req: Request, res: Response, next: NextFunction) {
      try {
        const platform = currentPlatform();
        const frontendPath =
          typeof req.query.frontendPath === 'string' && req.query.frontendPath.startsWith('/')
            ? req.query.frontendPath
            : '/';

        let result: ResolveResult;
        try {
          result = await tenantResolver.resolve(req, frontendPath);
        } catch (error) {
          if (error instanceof TenantNotFoundError) {
            const urls = buildRoutingUrls(req, platform, null);
            res.json({
              scope: 'unknown',
              surface: null,
              basename: '',
              tenantSlug: null,
              matchedBy: null,
              baseDomain: platform.baseDomain,
              pathPrefixEnabled: platform.pathPrefixRoutingEnabled,
              maintenanceMode: platform.maintenanceMode,
              maintenanceMessage: platform.maintenanceMessage ?? null,
              ...urls,
            });
            return;
          }
          throw error;
        }

        const basename = result.pathPrefix ?? '';
        const tenantSlug = result.tenant?.slug ?? null;
        const urls = buildRoutingUrls(req, platform, result);

        res.json({
          scope: result.scope,
          surface: result.surface ?? null,
          basename,
          tenantSlug,
          matchedBy: result.matchedBy ?? null,
          baseDomain: platform.baseDomain,
          pathPrefixEnabled: platform.pathPrefixRoutingEnabled,
          maintenanceMode: platform.maintenanceMode,
          maintenanceMessage: platform.maintenanceMessage ?? null,
          ...urls,
        });
      } catch (error) {
        next(error);
      }
    },

    async getPublicHealth(_req: unknown, res: Response, next: NextFunction) {
      try {
        const hasTenant = tenantContext.exists();
        res.json({
          status: 'ok',
          scope: hasTenant ? 'tenant' : 'platform',
          tenantId: tenantContext.id() ?? null,
          tenantSlug: tenantContext.slug() ?? null,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        next(error);
      }
    },
  };
}
