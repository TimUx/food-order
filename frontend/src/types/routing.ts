export type RoutingScope = 'tenant' | 'platform' | 'unknown';

export interface PlatformDomainsConfig {
  baseDomain: string;
  wwwDomain: string;
  apiDomain: string | null;
  wildcardDomain: string;
  tenantDomainPattern: string;
  cookieDomain: string | null;
  sessionDomain: string | null;
  source: 'infrastructure';
}

export interface RoutingConfig {
  scope: RoutingScope;
  basename: string;
  tenantSlug: string | null;
  matchedBy: 'subdomain' | 'path_prefix' | 'default_fallback' | 'custom_domain' | null;
  baseDomain: string;
  pathPrefixEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  platformUrl: string;
  wwwUrl: string;
  apiUrl: string;
  tenantUrl: string | null;
  domains: PlatformDomainsConfig;
}

function detectDefaultOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5173';
}

export const DEFAULT_ROUTING: RoutingConfig = {
  scope: 'tenant',
  basename: '',
  tenantSlug: null,
  matchedBy: 'default_fallback',
  baseDomain: 'localhost',
  pathPrefixEnabled: false,
  maintenanceMode: false,
  maintenanceMessage: null,
  platformUrl: detectDefaultOrigin(),
  wwwUrl: detectDefaultOrigin(),
  apiUrl: `${detectDefaultOrigin()}/api`,
  tenantUrl: null,
  domains: {
    baseDomain: 'localhost',
    wwwDomain: 'localhost',
    apiDomain: null,
    wildcardDomain: '*.localhost',
    tenantDomainPattern: '{subdomain}.localhost',
    cookieDomain: null,
    sessionDomain: null,
    source: 'infrastructure',
  },
};
