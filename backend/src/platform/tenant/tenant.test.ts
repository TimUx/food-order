import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../EventBus';
import { TenantContext } from './TenantContext';
import { PlatformContext } from './PlatformContext';
import { TenantService } from './TenantService';
import { TenantResolver } from './TenantResolver';
import { DEFAULT_PLATFORM_CONTEXT, DEFAULT_TENANT_SETTINGS } from './types';
import type { TenantRecord } from './types';
import type { Request } from 'express';

const sampleTenant: TenantRecord = {
  id: 'tenant-1',
  name: 'ASV Libelle',
  shortName: 'Libelle',
  slug: 'asv-libelle',
  subdomain: 'asv-libelle',
  status: 'ACTIVE',
  contactName: 'Kontakt',
  email: 'info@example.de',
  phone: null,
  logoUrl: null,
  locale: 'de-DE',
  timezone: 'Europe/Berlin',
  currency: 'EUR',
  theme: 'default',
  description: null,
  address: null,
  website: null,
  activatedAt: new Date(),
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createMockTenantService(overrides: Partial<TenantService> = {}): TenantService {
  return {
    findBySubdomain: vi.fn(),
    findBySlug: vi.fn(),
    findById: vi.fn(),
    findByHost: vi.fn(),
    findAll: vi.fn(),
    exists: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    resolveContextData: vi.fn(async (tenant: TenantRecord) => ({
      id: tenant.id,
      name: tenant.name,
      shortName: tenant.shortName,
      slug: tenant.slug,
      subdomain: tenant.subdomain,
      status: tenant.status,
      locale: tenant.locale,
      timezone: tenant.timezone,
      currency: tenant.currency,
      theme: tenant.theme,
      logoUrl: tenant.logoUrl,
      contactName: tenant.contactName,
      email: tenant.email,
      phone: tenant.phone,
      description: tenant.description,
      address: tenant.address,
      website: tenant.website,
      settings: DEFAULT_TENANT_SETTINGS,
    })),
    getPublicData: vi.fn(),
    getDefaultTenant: vi.fn(async () => sampleTenant),
    assertTenantAccessible: vi.fn(),
    toContextData: vi.fn(),
    ...overrides,
  } as unknown as TenantService;
}

describe('TenantContext', () => {
  it('stores and reads tenant data within run()', () => {
    const ctx = new TenantContext();
    const data = {
      id: 't1',
      name: 'Test',
      shortName: null,
      slug: 'test',
      subdomain: 'test',
      status: 'ACTIVE' as const,
      locale: 'de-DE',
      timezone: 'Europe/Berlin',
      currency: 'EUR',
      theme: 'default',
      logoUrl: null,
      contactName: null,
      email: null,
      phone: null,
      description: null,
      address: null,
      website: null,
      settings: DEFAULT_TENANT_SETTINGS,
    };

    ctx.run(data, () => {
      expect(ctx.exists()).toBe(true);
      expect(ctx.id()).toBe('t1');
      expect(ctx.name()).toBe('Test');
      expect(ctx.slug()).toBe('test');
      expect(ctx.subdomain()).toBe('test');
      expect(ctx.settings()).toEqual(DEFAULT_TENANT_SETTINGS);
      expect(ctx.current()).toEqual(data);
    });

    expect(ctx.exists()).toBe(false);
  });
});

describe('PlatformContext', () => {
  it('exposes boot data when no request store exists', () => {
    const ctx = new PlatformContext();
    ctx.initialize({ ...DEFAULT_PLATFORM_CONTEXT, platformName: 'TestPlattform' });
    expect(ctx.platformName()).toBe('TestPlattform');
    expect(ctx.baseDomain()).toBe(DEFAULT_PLATFORM_CONTEXT.baseDomain);
  });
});

describe('TenantResolver', () => {
  let platformContext: PlatformContext;
  let tenantService: TenantService;
  let resolver: TenantResolver;

  beforeEach(() => {
    platformContext = new PlatformContext();
    platformContext.initialize({
      ...DEFAULT_PLATFORM_CONTEXT,
      baseDomain: 'example.test',
      wwwSubdomain: 'www',
      wwwDomain: 'www.example.test',
      appSubdomain: 'app',
      appDomain: 'app.example.test',
      pathPrefixRoutingEnabled: false,
    });
    tenantService = createMockTenantService();
    resolver = new TenantResolver(tenantService, platformContext, {
      multiTenantEnabled: true,
      defaultTenantSlug: 'default',
      trustedProxies: [],
      trustProxyHops: 0,
    });
  });

  it('resolves www subdomain to homepage scope', async () => {
    const req = {
      headers: { host: 'www.example.test' },
      hostname: 'www.example.test',
      path: '/',
    } as Request;

    const result = await resolver.resolve(req);
    expect(result.type).toBe('platform');
    expect(result.scope).toBe('www');
    expect(result.surface).toBe('www');
  });

  it('resolves app subdomain to platform scope', async () => {
    const req = {
      headers: { host: 'app.example.test' },
      hostname: 'app.example.test',
      path: '/platform',
    } as Request;

    const result = await resolver.resolve(req);
    expect(result.type).toBe('platform');
    expect(result.scope).toBe('app');
    expect(result.surface).toBe('app');
  });

  it('resolves tenant by subdomain', async () => {
    vi.mocked(tenantService.findBySubdomain).mockResolvedValue(sampleTenant);
    const req = {
      headers: { host: 'asv-libelle.example.test' },
      hostname: 'asv-libelle.example.test',
      path: '/api/public/tenant',
    } as Request;

    const result = await resolver.resolve(req);
    expect(result.type).toBe('tenant');
    expect(result.scope).toBe('tenant');
    expect(result.matchedBy).toBe('subdomain');
    expect(result.tenant?.slug).toBe('asv-libelle');
  });

  it('falls back to default tenant on localhost when multi-tenant is disabled', async () => {
    platformContext.initialize({
      ...DEFAULT_PLATFORM_CONTEXT,
      baseDomain: 'localhost',
      pathPrefixRoutingEnabled: false,
    });
    resolver = new TenantResolver(tenantService, platformContext, {
      multiTenantEnabled: false,
      defaultTenantSlug: 'default',
      trustedProxies: [],
      trustProxyHops: 0,
    });
    vi.mocked(tenantService.findBySlug).mockResolvedValue({
      ...sampleTenant,
      slug: 'default',
      subdomain: 'default',
    });

    const req = {
      headers: { host: 'localhost' },
      hostname: 'localhost',
      path: '/api/public/club',
    } as Request;

    const result = await resolver.resolve(req);
    expect(result.type).toBe('tenant');
    expect(result.matchedBy).toBe('default_fallback');
  });

  it('rejects invalid host headers', async () => {
    const req = {
      headers: { host: 'evil<script>.example' },
      hostname: 'evil<script>.example',
      path: '/api/public/tenant',
    } as Request;

    await expect(resolver.resolve(req)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('EventBus tenant enrichment', () => {
  it('adds tenantId to object payloads', async () => {
    const tenantContext = new TenantContext();
    const bus = new EventBus(tenantContext);
    const received: Array<Record<string, unknown>> = [];

    tenantContext.run(
      {
        id: 'tenant-xyz',
        name: 'Test',
        shortName: null,
        slug: 'test',
        subdomain: 'test',
        status: 'ACTIVE',
        locale: 'de-DE',
        timezone: 'Europe/Berlin',
        currency: 'EUR',
        theme: 'default',
        logoUrl: null,
        contactName: null,
        email: null,
        phone: null,
        description: null,
        address: null,
        website: null,
        settings: DEFAULT_TENANT_SETTINGS,
      },
      () => {
        bus.on('demo', (payload) => {
          received.push(payload as Record<string, unknown>);
        });
      }
    );

    await tenantContext.runAsync(
      {
        id: 'tenant-xyz',
        name: 'Test',
        shortName: null,
        slug: 'test',
        subdomain: 'test',
        status: 'ACTIVE',
        locale: 'de-DE',
        timezone: 'Europe/Berlin',
        currency: 'EUR',
        theme: 'default',
        logoUrl: null,
        contactName: null,
        email: null,
        phone: null,
        description: null,
        address: null,
        website: null,
        settings: DEFAULT_TENANT_SETTINGS,
      },
      async () => {
        await bus.emit('demo', { foo: 'bar' });
      }
    );

    expect(received[0]?.tenantId).toBe('tenant-xyz');
    expect(received[0]?.foo).toBe('bar');
  });
});
