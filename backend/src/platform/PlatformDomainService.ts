import type { Request } from 'express';
import { config } from '../config';
import type { PlatformContextData } from './tenant/types';

export interface PlatformDomainConfig {
  baseDomain: string;
  wwwDomain: string;
  apiDomain: string | null;
  wildcardDomain: string;
  tenantDomainPattern: string;
  cookieDomain: string | null;
  sessionDomain: string | null;
  allowedOrigins: string[];
  /** Technisch kritische Werte stammen aus der Infrastruktur-Konfiguration (ENV/Docker). */
  source: 'infrastructure';
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

function isLocalDomain(domain: string): boolean {
  return domain === 'localhost' || domain === '127.0.0.1';
}

/**
 * Lädt die zentrale Domain-Konfiguration aus ENV (Docker/Infrastruktur).
 * Keine hartcodierten Produktionsdomains – Default für Entwicklung: localhost.
 */
export function loadDomainConfigFromEnv(): PlatformDomainConfig {
  const baseDomain =
    process.env.PLATFORM_DOMAIN?.trim() ||
    process.env.PLATFORM_BASE_DOMAIN?.trim() ||
    'localhost';

  const wwwDomain =
    process.env.PLATFORM_WWW_DOMAIN?.trim() ||
    (isLocalDomain(baseDomain) ? baseDomain : `www.${baseDomain}`);

  const apiDomain = process.env.PLATFORM_API_DOMAIN?.trim() || null;

  const wildcardDomain =
    process.env.PLATFORM_WILDCARD_DOMAIN?.trim() ||
    (isLocalDomain(baseDomain) ? `*.${baseDomain}` : `*.${baseDomain}`);

  const envOrigins = parseOrigins(process.env.PLATFORM_ALLOWED_ORIGINS);
  const allowedOrigins =
    envOrigins.length > 0
      ? envOrigins
      : isLocalDomain(baseDomain)
        ? [config.corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173']
        : [`https://${baseDomain}`, `https://www.${baseDomain}`];

  return {
    baseDomain,
    wwwDomain,
    apiDomain,
    wildcardDomain,
    tenantDomainPattern: `{subdomain}.${baseDomain}`,
    cookieDomain: process.env.PLATFORM_COOKIE_DOMAIN?.trim() || null,
    sessionDomain: process.env.PLATFORM_SESSION_DOMAIN?.trim() || null,
    allowedOrigins,
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

export function buildPlatformUrl(
  domains: PlatformDomainConfig,
  path = '',
  proto?: 'http' | 'https'
): string {
  const scheme = proto ?? (isLocalDomain(domains.baseDomain) ? 'http' : 'https');
  return `${scheme}://${domains.baseDomain}${normalizePath(path)}`;
}

export function buildWwwUrl(
  domains: PlatformDomainConfig,
  path = '',
  proto?: 'http' | 'https'
): string {
  const scheme = proto ?? (isLocalDomain(domains.baseDomain) ? 'http' : 'https');
  return `${scheme}://${domains.wwwDomain}${normalizePath(path)}`;
}

export function buildTenantUrl(
  domains: PlatformDomainConfig,
  subdomain: string,
  path = '',
  proto?: 'http' | 'https'
): string {
  if (isLocalDomain(domains.baseDomain)) {
    const origin = config.corsOrigin.replace(/\/$/, '');
    if (path) return `${origin}${normalizePath(path)}`;
    return origin;
  }
  const scheme = proto ?? 'https';
  return `${scheme}://${subdomain}.${domains.baseDomain}${normalizePath(path)}`;
}

export function buildApiUrl(
  domains: PlatformDomainConfig,
  path = '',
  proto?: 'http' | 'https'
): string {
  const host = domains.apiDomain ?? domains.baseDomain;
  const scheme = proto ?? (isLocalDomain(host) ? 'http' : 'https');
  return `${scheme}://${host}${normalizePath(path)}`;
}

export function formatTenantSubdomainExample(
  domains: PlatformDomainConfig,
  subdomain = 'mein-verein'
): string {
  if (isLocalDomain(domains.baseDomain)) {
    return `${subdomain} (lokal: Pfad-Präfix oder Host-Konfiguration)`;
  }
  return `${subdomain}.${domains.baseDomain}`;
}

/**
 * Wendet die Infrastruktur-Domain-Konfiguration auf den Plattformkontext an.
 * ENV-Werte haben Vorrang vor Datenbank-Defaults.
 */
export function applyDomainConfigToPlatformContext(
  ctx: PlatformContextData,
  domains: PlatformDomainConfig = loadDomainConfigFromEnv()
): PlatformContextData {
  const allowed = new Set([...ctx.allowedDomains, domains.baseDomain, domains.wwwDomain, 'localhost']);
  if (domains.apiDomain) allowed.add(domains.apiDomain);
  for (const origin of domains.allowedOrigins) {
    try {
      allowed.add(new URL(origin).hostname);
    } catch {
      /* ignore invalid origin */
    }
  }

  return {
    ...ctx,
    baseDomain: domains.baseDomain,
    wwwDomain: domains.wwwDomain,
    apiDomain: domains.apiDomain,
    wildcardDomain: domains.wildcardDomain,
    cookieDomain: domains.cookieDomain,
    sessionDomain: domains.sessionDomain,
    allowedDomains: [...allowed],
  };
}

export function getDomainPublicView(ctx: PlatformContextData): PlatformDomainConfig & {
  tenantDomainPattern: string;
} {
  return {
    baseDomain: ctx.baseDomain,
    wwwDomain: ctx.wwwDomain ?? (isLocalDomain(ctx.baseDomain) ? ctx.baseDomain : `www.${ctx.baseDomain}`),
    apiDomain: ctx.apiDomain ?? null,
    wildcardDomain: ctx.wildcardDomain,
    tenantDomainPattern: `{subdomain}.${ctx.baseDomain}`,
    cookieDomain: ctx.cookieDomain ?? null,
    sessionDomain: ctx.sessionDomain ?? null,
    allowedOrigins: [],
    source: 'infrastructure',
  };
}

export const platformDomainService = {
  loadFromEnv: loadDomainConfigFromEnv,
  resolveProto,
  buildPlatformUrl,
  buildWwwUrl,
  buildTenantUrl,
  buildApiUrl,
  formatTenantSubdomainExample,
  applyToContext: applyDomainConfigToPlatformContext,
  getPublicView: getDomainPublicView,
};
