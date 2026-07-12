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
      baseDomain: 'festschmiede.test',
      allowedDomains: ['festschmiede.test'],
      pathPrefixRoutingEnabled: true,
    }),
  } as never;

  return new TenantResolver(tenantService, platformContext, {
    multiTenantEnabled: true,
    defaultTenantSlug: 'default',
    trustedProxies: [],
    trustProxyHops,
  });
}

function fakeReq(host: string, forwardedHost?: string, reqPath = '/api/public/club'): Request {
  return {
    hostname: host,
    headers: forwardedHost ? { 'x-forwarded-host': forwardedHost } : {},
    path: reqPath,
    originalUrl: reqPath,
  } as Request;
}

describe('TenantResolver security', () => {
  it('ignores spoofed X-Forwarded-Host without trusted proxy', () => {
    const resolver = createResolver(0);
    expect(resolver.extractHost(fakeReq('festschmiede.test', 'evil-tenant.festschmiede.test'))).toBe(
      'festschmiede.test'
    );
  });

  it('uses X-Forwarded-Host when trust proxy is enabled', () => {
    const resolver = createResolver(1);
    expect(resolver.extractHost(fakeReq('localhost', 'tenant.festschmiede.test'))).toBe(
      'tenant.festschmiede.test'
    );
  });

  it('rejects invalid host characters', async () => {
    const resolver = createResolver(0);
    await expect(
      resolver.resolve({
        hostname: 'evil<script>',
        headers: {},
        path: '/api/public/club',
        originalUrl: '/api/public/club',
      } as Request)
    ).rejects.toThrow();
  });
});
