import { describe, it, expect, afterEach } from 'vitest';
import {
  loadDomainConfigFromEnv,
  buildPlatformUrl,
  buildWwwUrl,
  buildTenantUrl,
  buildApiUrl,
  formatTenantSubdomainExample,
  applyDomainConfigToPlatformContext,
} from './PlatformDomainService';
import { DEFAULT_PLATFORM_CONTEXT } from './tenant/types';

describe('PlatformDomainService', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('loads domain config from ENV without hardcoded production domain', () => {
    process.env.PLATFORM_DOMAIN = 'plattform.de';
    process.env.PLATFORM_WWW_DOMAIN = 'www.plattform.de';
    process.env.PLATFORM_API_DOMAIN = 'api.plattform.de';
    const cfg = loadDomainConfigFromEnv();
    expect(cfg.baseDomain).toBe('plattform.de');
    expect(cfg.wwwDomain).toBe('www.plattform.de');
    expect(cfg.apiDomain).toBe('api.plattform.de');
    expect(cfg.wildcardDomain).toBe('*.plattform.de');
  });

  it('defaults to localhost in development', () => {
    delete process.env.PLATFORM_DOMAIN;
    delete process.env.PLATFORM_BASE_DOMAIN;
    const cfg = loadDomainConfigFromEnv();
    expect(cfg.baseDomain).toBe('localhost');
  });

  it('builds URLs from configured domains', () => {
    const cfg = loadDomainConfigFromEnv();
    Object.assign(cfg, {
      baseDomain: 'example.test',
      wwwDomain: 'www.example.test',
      apiDomain: 'api.example.test',
    });
    expect(buildPlatformUrl(cfg, '/platform', 'https')).toBe('https://example.test/platform');
    expect(buildWwwUrl(cfg, '/', 'https')).toBe('https://www.example.test');
    expect(buildTenantUrl(cfg, 'verein', '/bestellung', 'https')).toBe('https://verein.example.test/bestellung');
    expect(buildApiUrl(cfg, '/api', 'https')).toBe('https://api.example.test/api');
    expect(formatTenantSubdomainExample(cfg, 'mein-verein')).toBe('mein-verein.example.test');
  });

  it('applies ENV domain config to platform context', () => {
    process.env.PLATFORM_DOMAIN = 'custom.example';
    const merged = applyDomainConfigToPlatformContext(DEFAULT_PLATFORM_CONTEXT, loadDomainConfigFromEnv());
    expect(merged.baseDomain).toBe('custom.example');
    expect(merged.wwwDomain).toBe('www.custom.example');
    expect(merged.allowedDomains).toContain('custom.example');
  });
});
