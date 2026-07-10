import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { TenantResolver } from './TenantResolver';

function createResolver(trustProxyHops = 0) {
  const tenantService = {
    findBySubdomain: async () => null,
    findBySlug: async () => null,
    resolveContextData: async () => ({}),
  } as never;

  const platformContext = {
    current: () => ({
      baseDomain: 'festmanager.test',
      allowedDomains: ['festmanager.test'],
      pathPrefixRoutingEnabled: false,
    }),
  } as never;

  return new TenantResolver(tenantService, platformContext, {
    multiTenantEnabled: true,
    defaultTenantSlug: 'default',
    trustedProxies: [],
    trustProxyHops,
  });
}

function fakeReq(host: string, forwardedHost?: string): Request {
  return {
    hostname: host,
    headers: forwardedHost ? { 'x-forwarded-host': forwardedHost } : {},
    path: '/api/public/club',
  } as Request;
}

describe('TenantResolver security', () => {
  it('ignores spoofed X-Forwarded-Host without trusted proxy', () => {
    const resolver = createResolver(0);
    expect(resolver.extractHost(fakeReq('festmanager.test', 'evil-tenant.festmanager.test'))).toBe(
      'festmanager.test'
    );
  });

  it('uses X-Forwarded-Host when trust proxy is enabled', () => {
    const resolver = createResolver(1);
    expect(resolver.extractHost(fakeReq('localhost', 'tenant.festmanager.test'))).toBe(
      'tenant.festmanager.test'
    );
  });

  it('rejects invalid host characters', async () => {
    const resolver = createResolver(0);
    await expect(
      resolver.resolve({
        hostname: 'evil<script>',
        headers: {},
        path: '/api/public/club',
      } as Request)
    ).rejects.toThrow();
  });
});
