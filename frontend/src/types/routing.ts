export type RoutingScope = 'www' | 'app' | 'tenant' | 'unknown';

export type PlatformSurface = 'www' | 'app' | 'reserved' | 'apex' | null;

export interface PlatformDomainsConfig {
  platformDomain: string;
  baseDomain: string;
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
  reservedSubdomains: string[];
  source: 'infrastructure';
}

export interface RoutingConfig {
  scope: RoutingScope;
  surface: PlatformSurface;
  basename: string;
  tenantSlug: string | null;
  matchedBy: 'subdomain' | 'path_prefix' | 'default_fallback' | 'custom_domain' | 'localhost_path' | null;
  baseDomain: string;
  pathPrefixEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  /** @deprecated Nutze appUrl */
  platformUrl: string;
  wwwUrl: string;
  appUrl: string;
  apiUrl: string;
  apiBasePath: string;
  tenantUrl: string | null;
  domains: PlatformDomainsConfig;
}

function detectDefaultOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5173';
}

const defaultOrigin = detectDefaultOrigin();

export const DEFAULT_ROUTING: RoutingConfig = {
  scope: 'tenant',
  surface: null,
  basename: '',
  tenantSlug: null,
  matchedBy: 'default_fallback',
  baseDomain: 'localhost',
  pathPrefixEnabled: false,
  maintenanceMode: false,
  maintenanceMessage: null,
  platformUrl: defaultOrigin,
  wwwUrl: defaultOrigin,
  appUrl: defaultOrigin,
  apiUrl: `${defaultOrigin}/api`,
  apiBasePath: '/api',
  tenantUrl: null,
  domains: {
    platformDomain: 'localhost',
    baseDomain: 'localhost',
    wwwSubdomain: 'www',
    wwwDomain: 'localhost',
    appSubdomain: 'app',
    appDomain: 'localhost',
    apiSubdomain: 'api',
    apiDomain: null,
    docsSubdomain: null,
    docsDomain: null,
    statusSubdomain: null,
    statusDomain: null,
    wildcardDomain: '*.localhost',
    tenantDomainPattern: '{tenant}',
    cookieDomain: null,
    sessionDomain: null,
    reservedSubdomains: ['www', 'app', 'api', 'docs', 'status'],
    source: 'infrastructure',
  },
};

export function isPlatformSurfaceScope(scope: RoutingScope): boolean {
  return scope === 'www' || scope === 'app';
}
