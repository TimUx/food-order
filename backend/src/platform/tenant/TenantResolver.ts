import type { Request } from 'express';
import type { TenantService } from './TenantService';
import type { PlatformContext } from './PlatformContext';
import type { ResolveResult, PlatformSurface, RoutingScope } from './types';
import {
  TenantInvalidDomainError,
  TenantInvalidHostError,
  TenantNotFoundError,
} from './errors';
import {
  platformDomainService,
  isLocalPlatformDomain,
} from '../PlatformDomainService';

interface TenantResolverConfig {
  multiTenantEnabled: boolean;
  defaultTenantSlug: string;
  trustedProxies: string[];
  trustProxyHops: number;
}

interface CacheEntry {
  result: ResolveResult;
  expiresAt: number;
}

function platformResult(
  scope: RoutingScope,
  surface: PlatformSurface,
  matchedBy: ResolveResult['matchedBy'] = 'path_prefix'
): ResolveResult {
  return { type: 'platform', scope, surface, matchedBy };
}

export class TenantResolver {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly negativeCache = new Map<string, number>();
  private readonly cacheTtlMs = 60_000;
  private readonly negativeCacheTtlMs = 30_000;

  constructor(
    private readonly tenantService: TenantService,
    private readonly platformContext: PlatformContext,
    private readonly config: TenantResolverConfig
  ) {}

  async resolve(req: Request, pathOverride?: string): Promise<ResolveResult> {
    const host = this.extractHost(req);
    if (!host) {
      throw new TenantInvalidHostError();
    }

    this.validateHost(host);

    const platform = this.platformContext.current();
    const path = pathOverride ?? this.extractRoutingPath(req);
    const cacheKey = this.buildCacheKey(host, path);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const result = await this.resolveInternal(host, path, platform);
    this.setCache(cacheKey, result);
    return result;
  }

  private async resolveInternal(
    host: string,
    path: string,
    platform: ReturnType<PlatformContext['current']>
  ): Promise<ResolveResult> {
    const normalizedHost = host.toLowerCase();
    const domains = platformDomainService.getPublicView(platform);
    const pathRoutingActive =
      platform.pathPrefixRoutingEnabled || this.config.multiTenantEnabled;

    if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') {
      if (this.isPlatformPath(path)) {
        return platformResult('app', 'app', 'localhost_path');
      }
      if (pathRoutingActive) {
        const prefixResult = await this.resolvePathPrefix(path);
        if (prefixResult) return prefixResult;
      }
      if (!this.config.multiTenantEnabled) {
        return this.resolveDefaultTenant('default_fallback');
      }
      if (isLocalPlatformDomain(domains.platformDomain)) {
        return platformResult('www', 'www', 'localhost_path');
      }
    }

    const subdomain = platformDomainService.extractSubdomainFromHost(
      normalizedHost,
      domains.platformDomain
    );
    const surface = platformDomainService.resolveSurfaceFromSubdomain(subdomain, domains);

    if (surface === 'www' || subdomain === null) {
      return platformResult('www', surface === 'apex' ? 'apex' : 'www', 'subdomain');
    }

    if (surface === 'app' || surface === 'reserved') {
      if (pathRoutingActive) {
        const prefixResult = await this.resolvePathPrefix(path);
        if (prefixResult) return prefixResult;
      }
      return platformResult('app', surface === 'reserved' ? 'reserved' : 'app', 'subdomain');
    }

    throw new TenantNotFoundError();
  }

  private isPlatformPath(path: string): boolean {
    return (
      path.startsWith('/platform') ||
      path.startsWith('/api/platform') ||
      /^\/[^/]+\/platform(\/|$)/.test(path)
    );
  }

  private async resolvePathPrefix(path: string): Promise<ResolveResult | null> {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    const slug = segments[0];
    const platform = this.platformContext.current();
    const domains = platformDomainService.getPublicView(platform);

    if (platformDomainService.isReservedSubdomain(slug, domains) || slug === 'api') {
      return null;
    }

    const negativeKey = `neg:slug:${slug}`;
    if (this.isNegativeCached(negativeKey)) {
      return null;
    }

    const tenant = await this.tenantService.findBySlug(slug);
    if (!tenant) {
      this.setNegativeCache(negativeKey);
      return null;
    }

    const contextData = await this.tenantService.resolveContextData(tenant);
    return {
      type: 'tenant',
      scope: 'tenant',
      tenant: contextData,
      matchedBy: 'path_prefix',
      pathPrefix: `/${slug}`,
    };
  }

  private async resolveDefaultTenant(
    matchedBy: ResolveResult['matchedBy']
  ): Promise<ResolveResult> {
    const tenant = await this.tenantService.findBySlug(this.config.defaultTenantSlug);
    if (!tenant) {
      throw new TenantNotFoundError('Der Standard-Veranstalter ist nicht konfiguriert.');
    }
    const contextData = await this.tenantService.resolveContextData(tenant);
    return {
      type: 'tenant',
      scope: 'tenant',
      tenant: contextData,
      matchedBy,
    };
  }

  extractHost(req: Request): string | null {
    const trustProxy = this.config.trustProxyHops > 0;
    let raw: string | undefined;

    if (trustProxy) {
      const forwarded = req.headers['x-forwarded-host'];
      raw = typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : req.hostname;
    } else {
      raw = req.hostname;
    }

    if (!raw) return null;
    return raw.toLowerCase().split(':')[0] ?? null;
  }

  extractRoutingPath(req: Request): string {
    const original = req.originalUrl?.split('?')[0];
    return original || req.path;
  }

  private validateHost(host: string): void {
    if (!/^[a-z0-9.-]+$/i.test(host)) {
      throw new TenantInvalidHostError();
    }

    const platform = this.platformContext.current();
    const allowed = platform.allowedDomains;
    const baseDomain = platform.baseDomain.toLowerCase();

    const isAllowed =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === baseDomain ||
      host.endsWith(`.${baseDomain}`) ||
      allowed.some(
        (domain) =>
          host === domain.toLowerCase() || host.endsWith(`.${domain.toLowerCase()}`)
      );

    if (!isAllowed) {
      throw new TenantInvalidDomainError();
    }
  }

  private buildCacheKey(host: string, path: string): string {
    const firstSegment = path.split('/').filter(Boolean)[0] ?? '';
    return `${host}:${firstSegment}`;
  }

  private getFromCache(key: string): ResolveResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.result;
  }

  private setCache(key: string, result: ResolveResult): void {
    this.cache.set(key, { result, expiresAt: Date.now() + this.cacheTtlMs });
  }

  private isNegativeCached(key: string): boolean {
    const expiresAt = this.negativeCache.get(key);
    if (!expiresAt) return false;
    if (Date.now() > expiresAt) {
      this.negativeCache.delete(key);
      return false;
    }
    return true;
  }

  private setNegativeCache(key: string): void {
    this.negativeCache.set(key, Date.now() + this.negativeCacheTtlMs);
  }

  invalidateCache(): void {
    this.cache.clear();
    this.negativeCache.clear();
  }
}
