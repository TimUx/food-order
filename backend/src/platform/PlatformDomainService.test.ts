import { describe, it, expect, afterEach } from 'vitest';
import {
  loadDomainConfigFromEnv,
  buildAppUrl,
  buildWwwUrl,
  buildTenantUrl,
  buildApiUrl,
  formatTenantSubdomainExample,
  applyDomainConfigToPlatformContext,
  resolveSurfaceFromSubdomain,
  isReservedSubdomain,
  productionCorsOriginsFromEnv,
  resolveCorsNetworkSettings,
} from './PlatformDomainService';
import { DEFAULT_PLATFORM_CONTEXT } from './tenant/types';

describe('PlatformDomainService', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('loads canonical domain config from ENV without hardcoded production domain', () => {
    process.env.PLATFORM_DOMAIN = 'plattform.de';
    process.env.WWW_SUBDOMAIN = 'www';
    process.env.APP_SUBDOMAIN = 'app';
    const cfg = loadDomainConfigFromEnv();
    expect(cfg.platformDomain).toBe('plattform.de');
    expect(cfg.wwwDomain).toBe('www.plattform.de');
    expect(cfg.appDomain).toBe('app.plattform.de');
    expect(cfg.apiDomain).toBe('api.plattform.de');
    expect(cfg.wildcardDomain).toBe('*.plattform.de');
    expect(cfg.reservedSubdomains).toContain('www');
    expect(cfg.reservedSubdomains).toContain('app');
  });

  it('defaults to localhost in development', () => {
    delete process.env.PLATFORM_DOMAIN;
    delete process.env.PLATFORM_BASE_DOMAIN;
    const cfg = loadDomainConfigFromEnv();
    expect(cfg.platformDomain).toBe('localhost');
  });

  it('uses CORS origin with port for local www and app URLs', () => {
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    const cfg = loadDomainConfigFromEnv();
    expect(buildWwwUrl(cfg, '/faq')).toBe('http://localhost:5173/faq');
    expect(buildAppUrl(cfg, '/platform')).toBe('http://localhost:5173/platform');
    expect(buildTenantUrl(cfg, 'default', '/bestellung')).toBe('http://localhost:5173/bestellung');
  });

  it('builds www, app and tenant URLs from configured domains', () => {
    const cfg = loadDomainConfigFromEnv();
    Object.assign(cfg, {
      platformDomain: 'example.test',
      wwwDomain: 'www.example.test',
      appDomain: 'app.example.test',
      apiDomain: 'api.example.test',
    });
    expect(buildAppUrl(cfg, '/platform', 'https')).toBe('https://app.example.test/platform');
    expect(buildWwwUrl(cfg, '/', 'https')).toBe('https://www.example.test');
    expect(buildTenantUrl(cfg, 'verein', '/bestellung', 'https')).toBe('https://verein.example.test/bestellung');
    expect(buildApiUrl(cfg, '/api', 'https')).toBe('https://api.example.test/api');
    expect(formatTenantSubdomainExample(cfg, 'mein-verein')).toBe('mein-verein.example.test');
  });

  it('resolves surface from subdomain labels', () => {
    const cfg = loadDomainConfigFromEnv();
    Object.assign(cfg, {
      platformDomain: 'example.test',
      wwwSubdomain: 'www',
      appSubdomain: 'app',
      reservedSubdomains: ['www', 'app', 'api', 'docs', 'status'],
    });
    expect(resolveSurfaceFromSubdomain('www', cfg)).toBe('www');
    expect(resolveSurfaceFromSubdomain('app', cfg)).toBe('app');
    expect(resolveSurfaceFromSubdomain('api', cfg)).toBe('reserved');
    expect(resolveSurfaceFromSubdomain('verein', cfg)).toBe('tenant');
    expect(isReservedSubdomain('api', cfg)).toBe(true);
    expect(isReservedSubdomain('verein', cfg)).toBe(false);
  });

  it('applies ENV domain config to platform context', () => {
    process.env.PLATFORM_DOMAIN = 'custom.example';
    const merged = applyDomainConfigToPlatformContext(DEFAULT_PLATFORM_CONTEXT, loadDomainConfigFromEnv());
    expect(merged.baseDomain).toBe('custom.example');
    expect(merged.wwwDomain).toBe('www.custom.example');
    expect(merged.appDomain).toBe('app.custom.example');
    expect(merged.allowedDomains).toContain('custom.example');
    expect(merged.reservedSubdomains).toContain('app');
  });

  it('replaces localhost DB CORS defaults with ENV production origins', () => {
    process.env.NODE_ENV = 'production';
    process.env.PLATFORM_DOMAIN = 'plattform.de';
    const domainConfig = loadDomainConfigFromEnv();
    const resolved = resolveCorsNetworkSettings(
      { corsOrigins: ['http://localhost:5173'], allowWildcardSubdomains: false },
      domainConfig
    );
    expect(resolved.corsOrigins).toEqual([
      'https://www.plattform.de',
      'https://app.plattform.de',
      'https://api.plattform.de',
    ]);
    expect(resolved.allowWildcardSubdomains).toBe(true);
  });

  it('always prefers ENV HTTPS origins in production even when DB has localhost', () => {
    process.env.NODE_ENV = 'production';
    process.env.PLATFORM_DOMAIN = 'plattform.de';
    process.env.PLATFORM_ALLOWED_ORIGINS = 'https://plattform.de,https://*.plattform.de';
    const domainConfig = loadDomainConfigFromEnv();
    const resolved = resolveCorsNetworkSettings(
      { corsOrigins: ['http://localhost:5173'] },
      domainConfig
    );
    expect(resolved.corsOrigins).toEqual(['https://plattform.de']);
    expect(resolved.allowWildcardSubdomains).toBe(true);
  });

  it('uses CORS_ORIGIN fallback when allowed origins only contain wildcards', () => {
    process.env.NODE_ENV = 'production';
    process.env.PLATFORM_DOMAIN = 'plattform.de';
    process.env.CORS_ORIGIN = 'https://app.plattform.de';
    process.env.PLATFORM_ALLOWED_ORIGINS = 'https://*.plattform.de';
    const domainConfig = loadDomainConfigFromEnv();
    expect(productionCorsOriginsFromEnv(domainConfig)).toEqual(['https://app.plattform.de']);
  });
});
