import type { Request } from 'express';
import { config } from '../config';
import type { PlatformContextData } from './tenant/types';

export type PlatformSurface = 'www' | 'app' | 'reserved' | 'apex';

export interface PlatformDomainConfig {
  baseDomain?: string;
  platformDomain: string;
  wwwSubdomain: string;
  wwwDomain: string;
  appSubdomain: string;
  appDomain: string;
  apiSubdomain: string;
  apiDomain: string | null;
  docsSubdomain: string | null;
  docsDomain: string | null;
  statusSubdomain: string | null;
  statusDomain: string | null;
  wildcardDomain: string;
  tenantDomainPattern: string;
  cookieDomain: string | null;
  sessionDomain: string | null;
  allowedOrigins: string[];
  reservedSubdomains: string[];
  tenantRoutingMode: 'path';
  source: 'infrastructure';
}

const DEFAULT_WWW_SUBDOMAIN = 'www';
const DEFAULT_APP_SUBDOMAIN = 'app';
const DEFAULT_API_SUBDOMAIN = 'api';
const DEFAULT_DOCS_SUBDOMAIN = 'docs';
const DEFAULT_STATUS_SUBDOMAIN = 'status';
const DEFAULT_RESERVED = [DEFAULT_WWW_SUBDOMAIN, DEFAULT_APP_SUBDOMAIN, DEFAULT_API_SUBDOMAIN, DEFAULT_DOCS_SUBDOMAIN, DEFAULT_STATUS_SUBDOMAIN];

function parseList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

export function isLocalPlatformDomain(domain: string): boolean {
  return domain === 'localhost' || domain === '127.0.0.1';
}

function isProductionEnv(): boolean {
  return (process.env.NODE_ENV || 'development') === 'production';
}

/** Gültige HTTPS-Origins für Produktion (ohne Wildcard-URL-Strings). */
export function productionCorsOriginsFromEnv(domainConfig: PlatformDomainConfig): string[] {
  const raw =
    domainConfig.allowedOrigins.length > 0
      ? domainConfig.allowedOrigins
      : [
          `https://${domainConfig.wwwDomain}`,
          `https://${domainConfig.appDomain}`,
          ...(domainConfig.apiDomain ? [`https://${domainConfig.apiDomain}`] : []),
        ];

  const httpsOrigins = raw.filter((origin) => {
    try {
      return new URL(origin).protocol === 'https:';
    } catch {
      return false;
    }
  });

  if (httpsOrigins.length > 0) {
    return httpsOrigins;
  }

  const corsOrigin = process.env.CORS_ORIGIN?.trim();
  if (corsOrigin) {
    try {
      if (new URL(corsOrigin).protocol === 'https:') {
        return [corsOrigin];
      }
    } catch {
      /* ignore */
    }
  }

  return [];
}

/** Produktions-CORS aus ENV/Domain-Konfiguration (DB-Localhost-Defaults überschreiben). */
export function resolveCorsNetworkSettings(
  networkSettings: Record<string, unknown> | undefined,
  domainConfig: PlatformDomainConfig
): Record<string, unknown> {
  if (!isProductionEnv()) {
    return networkSettings ?? {};
  }

  const corsOrigins = productionCorsOriginsFromEnv(domainConfig);
  if (corsOrigins.length === 0) {
    return networkSettings ?? {};
  }

  const allowWildcard =
    typeof networkSettings?.allowWildcardSubdomains === 'boolean'
      ? networkSettings.allowWildcardSubdomains
      : Boolean(domainConfig.wildcardDomain) ||
        domainConfig.allowedOrigins.some((origin) => origin.includes('*.'));

  return {
    ...networkSettings,
    corsOrigins,
    allowWildcardSubdomains: allowWildcard,
  };
}

function buildHost(subdomain: string, platformDomain: string): string {
  if (isLocalPlatformDomain(platformDomain)) {
    return subdomain === platformDomain ? platformDomain : `${subdomain}.${platformDomain}`;
  }
  return `${subdomain}.${platformDomain}`;
}

/**
 * Lädt die kanonische Domain-Konfiguration aus ENV.
 * Struktur: www.<domain> (Homepage), app.<domain> (Plattform), <tenant>.<domain> (Mandanten).
 */
export function loadDomainConfigFromEnv(): PlatformDomainConfig {
  const platformDomain =
    process.env.PLATFORM_DOMAIN?.trim() ||
    process.env.PLATFORM_BASE_DOMAIN?.trim() ||
    'localhost';

  const wwwSubdomain = process.env.WWW_SUBDOMAIN?.trim().toLowerCase() || DEFAULT_WWW_SUBDOMAIN;
  const appSubdomain = process.env.APP_SUBDOMAIN?.trim().toLowerCase() || DEFAULT_APP_SUBDOMAIN;
  const apiSubdomain = process.env.API_SUBDOMAIN?.trim().toLowerCase() || DEFAULT_API_SUBDOMAIN;
  const docsSubdomain = process.env.DOCS_SUBDOMAIN?.trim().toLowerCase() || DEFAULT_DOCS_SUBDOMAIN;
  const statusSubdomain = process.env.STATUS_SUBDOMAIN?.trim().toLowerCase() || DEFAULT_STATUS_SUBDOMAIN;

  const extraReserved = parseList(process.env.PLATFORM_RESERVED_SUBDOMAINS ?? process.env.RESERVED_SUBDOMAINS);
  const reservedSubdomains = [...new Set([...DEFAULT_RESERVED, ...extraReserved])];

  const wwwDomain =
    process.env.PLATFORM_WWW_DOMAIN?.trim() ||
    (isLocalPlatformDomain(platformDomain) ? platformDomain : buildHost(wwwSubdomain, platformDomain));

  const appDomain =
    process.env.PLATFORM_APP_DOMAIN?.trim() ||
    (isLocalPlatformDomain(platformDomain) ? platformDomain : buildHost(appSubdomain, platformDomain));

  const apiDomain = process.env.PLATFORM_API_DOMAIN?.trim() || null;

  const docsDomain = isLocalPlatformDomain(platformDomain)
    ? null
    : buildHost(docsSubdomain, platformDomain);

  const statusDomain = isLocalPlatformDomain(platformDomain)
    ? null
    : buildHost(statusSubdomain, platformDomain);

  const wildcardDomain =
    process.env.PLATFORM_WILDCARD_DOMAIN?.trim() ||
    (isLocalPlatformDomain(platformDomain) ? `*.${platformDomain}` : `*.${platformDomain}`);

  const envOrigins = parseOrigins(process.env.PLATFORM_ALLOWED_ORIGINS ?? process.env.ALLOWED_ORIGINS);
  const allowedOrigins =
    envOrigins.length > 0
      ? envOrigins
      : isLocalPlatformDomain(platformDomain)
        ? [config.corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173']
        : [
            `https://${wwwDomain}`,
            `https://${appDomain}`,
          ];

  return {
    platformDomain,
    wwwSubdomain,
    wwwDomain,
    appSubdomain,
    appDomain,
    apiSubdomain,
    apiDomain,
    docsSubdomain: isLocalPlatformDomain(platformDomain) ? null : docsSubdomain,
    docsDomain,
    statusSubdomain: isLocalPlatformDomain(platformDomain) ? null : statusSubdomain,
    statusDomain,
    wildcardDomain,
    tenantDomainPattern: `{tenant}.${platformDomain}`,
    cookieDomain: process.env.PLATFORM_COOKIE_DOMAIN?.trim() || process.env.COOKIE_DOMAIN?.trim() || null,
    sessionDomain: process.env.PLATFORM_SESSION_DOMAIN?.trim() || process.env.SESSION_DOMAIN?.trim() || null,
    allowedOrigins,
    reservedSubdomains,
    tenantRoutingMode: 'path',
    source: 'infrastructure',
  };
}

export function resolveProto(req?: Pick<Request, 'headers' | 'secure'>): 'http' | 'https' {
  if (req) {
    if (req.headers['x-forwarded-proto'] === 'https' || req.secure) return 'https';
  }
  if (config.nodeEnv === 'production') return 'https';
  return 'http';
}

function normalizePath(path: string): string {
  if (!path || path === '/') return '';
  return path.startsWith('/') ? path : `/${path}`;
}

function defaultProto(domains: PlatformDomainConfig): 'http' | 'https' {
  return isLocalPlatformDomain(domains.platformDomain) ? 'http' : 'https';
}

function buildLocalDevUrl(path = ''): string {
  const origin = config.corsOrigin.replace(/\/$/, '');
  return `${origin}${normalizePath(path)}`;
}

export function buildWwwUrl(domains: PlatformDomainConfig, path = '', proto?: 'http' | 'https'): string {
  if (isLocalPlatformDomain(domains.platformDomain)) {
    return buildLocalDevUrl(path);
  }
  const scheme = proto ?? defaultProto(domains);
  return `${scheme}://${domains.wwwDomain}${normalizePath(path)}`;
}

export function buildAppUrl(domains: PlatformDomainConfig, path = '', proto?: 'http' | 'https'): string {
  if (isLocalPlatformDomain(domains.platformDomain)) {
    return buildLocalDevUrl(path);
  }
  const scheme = proto ?? defaultProto(domains);
  return `${scheme}://${domains.appDomain}${normalizePath(path)}`;
}

/** @deprecated Nutze buildAppUrl – Alias für Abwärtskompatibilität */
export function buildPlatformUrl(domains: PlatformDomainConfig, path = '', proto?: 'http' | 'https'): string {
  return buildAppUrl(domains, path, proto);
}

export function buildTenantUrl(
  domains: PlatformDomainConfig,
  tenantSlug: string,
  path = '',
  proto?: 'http' | 'https'
): string {
  const normalizedPath = normalizePath(path);
  if (isLocalPlatformDomain(domains.platformDomain)) {
    return buildLocalDevUrl(`/${tenantSlug}${normalizedPath}`);
  }
  const scheme = proto ?? defaultProto(domains);
  return `${scheme}://${domains.appDomain}/${tenantSlug}${normalizedPath}`;
}

export function buildApiUrl(
  domains: PlatformDomainConfig,
  path = '',
  proto?: 'http' | 'https',
  tenantSlug?: string | null
): string {
  const normalizedPath = normalizePath(path);
  const apiPath = normalizedPath.startsWith('/api') ? normalizedPath : `/api${normalizedPath}`;

  if (isLocalPlatformDomain(domains.platformDomain)) {
    const origin = config.corsOrigin.replace(/\/$/, '');
    if (tenantSlug) {
      return `${origin}/${tenantSlug}${apiPath}`;
    }
    return `${origin}${apiPath}`;
  }

  const host = domains.appDomain;
  const scheme = proto ?? defaultProto(domains);
  if (tenantSlug) {
    return `${scheme}://${host}/${tenantSlug}${apiPath}`;
  }
  return `${scheme}://${host}${apiPath}`;
}

export function buildDocsUrl(domains: PlatformDomainConfig, path = '', proto?: 'http' | 'https'): string {
  if (!domains.docsDomain) return buildWwwUrl(domains, '/dokumentation', proto);
  const scheme = proto ?? defaultProto(domains);
  return `${scheme}://${domains.docsDomain}${normalizePath(path)}`;
}

export function buildStatusUrl(domains: PlatformDomainConfig, path = '', proto?: 'http' | 'https'): string {
  if (!domains.statusDomain) return buildAppUrl(domains, '/platform/health', proto);
  const scheme = proto ?? defaultProto(domains);
  return `${scheme}://${domains.statusDomain}${normalizePath(path)}`;
}

export function formatTenantSubdomainExample(
  domains: PlatformDomainConfig,
  tenantSlug = 'mein-verein'
): string {
  if (isLocalPlatformDomain(domains.platformDomain)) {
    return `${tenantSlug} (lokal: /${tenantSlug})`;
  }
  return `${domains.appDomain}/${tenantSlug}`;
}

export function isReservedSubdomain(subdomain: string, domains: PlatformDomainConfig): boolean {
  return domains.reservedSubdomains.includes(subdomain.toLowerCase());
}

export function resolveSurfaceFromSubdomain(
  subdomain: string | null,
  domains: PlatformDomainConfig
): PlatformSurface | 'tenant' {
  if (!subdomain) return 'apex';
  const label = subdomain.toLowerCase();
  if (label === domains.wwwSubdomain) return 'www';
  if (label === domains.appSubdomain) return 'app';
  if (isReservedSubdomain(label, domains)) return 'reserved';
  return 'tenant';
}

export function extractSubdomainFromHost(host: string, platformDomain: string): string | null {
  const normalized = host.toLowerCase();
  const base = platformDomain.toLowerCase();

  if (normalized === base || normalized === 'localhost' || normalized === '127.0.0.1') {
    return null;
  }

  if (normalized.endsWith(`.${base}`)) {
    return normalized.slice(0, -(base.length + 1)).split('.')[0] ?? null;
  }

  if (isLocalPlatformDomain(base) && normalized.endsWith('.localhost')) {
    return normalized.replace('.localhost', '');
  }

  return null;
}

export function applyDomainConfigToPlatformContext(
  ctx: PlatformContextData,
  domains: PlatformDomainConfig = loadDomainConfigFromEnv()
): PlatformContextData {
  const allowed = new Set([
    ...ctx.allowedDomains,
    domains.platformDomain,
    domains.wwwDomain,
    domains.appDomain,
    'localhost',
    '127.0.0.1',
  ]);
  if (domains.apiDomain) allowed.add(domains.apiDomain);
  if (domains.docsDomain) allowed.add(domains.docsDomain);
  if (domains.statusDomain) allowed.add(domains.statusDomain);
  for (const origin of domains.allowedOrigins) {
    try {
      allowed.add(new URL(origin).hostname);
    } catch {
      /* ignore */
    }
  }

  return {
    ...ctx,
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
    cookieDomain: domains.cookieDomain,
    sessionDomain: domains.sessionDomain,
    allowedDomains: [...allowed],
    reservedSubdomains: domains.reservedSubdomains,
  };
}

export function getDomainPublicView(ctx: PlatformContextData | undefined): PlatformDomainConfig {
  const domains = loadDomainConfigFromEnv();
  if (!ctx) {
    return domains;
  }
  return {
    ...domains,
    baseDomain: ctx.baseDomain,
    platformDomain: ctx.baseDomain,
    wwwSubdomain: ctx.wwwSubdomain ?? domains.wwwSubdomain,
    wwwDomain: ctx.wwwDomain ?? domains.wwwDomain,
    appSubdomain: ctx.appSubdomain ?? domains.appSubdomain,
    appDomain: ctx.appDomain ?? domains.appDomain,
    apiSubdomain: ctx.apiSubdomain ?? domains.apiSubdomain,
    apiDomain: ctx.apiDomain ?? domains.apiDomain,
    docsSubdomain: ctx.docsSubdomain ?? domains.docsSubdomain,
    docsDomain: ctx.docsDomain ?? domains.docsDomain,
    statusSubdomain: ctx.statusSubdomain ?? domains.statusSubdomain,
    statusDomain: ctx.statusDomain ?? domains.statusDomain,
    wildcardDomain: ctx.wildcardDomain,
    reservedSubdomains: ctx.reservedSubdomains?.length ? ctx.reservedSubdomains : domains.reservedSubdomains,
    allowedOrigins: domains.allowedOrigins,
    tenantDomainPattern: `{tenant}`,
    source: 'infrastructure',
  };
}

export const platformDomainService = {
  loadFromEnv: loadDomainConfigFromEnv,
  resolveProto,
  buildWwwUrl,
  buildAppUrl,
  buildPlatformUrl,
  buildTenantUrl,
  buildApiUrl,
  buildDocsUrl,
  buildStatusUrl,
  formatTenantSubdomainExample,
  isReservedSubdomain,
  resolveSurfaceFromSubdomain,
  extractSubdomainFromHost,
  applyToContext: applyDomainConfigToPlatformContext,
  getPublicView: getDomainPublicView,
  resolveCorsNetworkSettings,
  productionCorsOriginsFromEnv,
};
