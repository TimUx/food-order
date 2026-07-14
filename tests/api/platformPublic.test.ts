import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import type { Express } from 'express';
import { createTestApp, tenantApi, tenantApiPath, QA_TENANT_SLUG } from './setup';
import { QA_EVENT_ID } from '../fixtures/constants';

const request = typeof supertest === 'function'
  ? supertest
  : (supertest as unknown as { default: typeof supertest }).default;

describe('API platform public', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  it('GET /api/public/platform returns platform metadata', async () => {
    const res = await request(app).get('/api/public/platform').set('Host', 'localhost');
    expect(res.status).toBe(200);
    expect(res.body.name).toBeDefined();
    expect(res.body.baseDomain).toBeDefined();
    expect(typeof res.body.registrationEnabled).toBe('boolean');
  });

  it('GET /api/public/platform/legal-links returns array', async () => {
    const res = await request(app).get('/api/public/platform/legal-links').set('Host', 'localhost');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('GET /api/public/routing-config resolves app scope on localhost with frontendPath', async () => {
    const res = await request(app)
      .get('/api/public/routing-config')
      .query({ frontendPath: '/platform' })
      .set('Host', 'localhost');
    expect(res.status).toBe(200);
    expect(res.body.scope).toBe('app');
  });

  it('GET /api/public/routing-config resolves tenant scope with path prefix', async () => {
    const res = await request(app)
      .get('/api/public/routing-config')
      .query({ frontendPath: `/${QA_TENANT_SLUG}/public` })
      .set('Host', 'localhost');
    expect(res.status).toBe(200);
    expect(res.body.scope).toBe('tenant');
    expect(res.body.tenantSlug).toBe(QA_TENANT_SLUG);
    expect(res.body.basename).toBe(`/${QA_TENANT_SLUG}`);
    expect(res.body.apiBasePath).toBe(`/${QA_TENANT_SLUG}/api`);
    expect(res.body.matchedBy).toBe('path_prefix');
  });

  it('GET /api/public/routing-config returns unknown scope for missing tenant slug', async () => {
    const res = await request(app)
      .get('/api/public/routing-config')
      .query({ frontendPath: '/definitely-missing-tenant-slug/public' })
      .set('Host', 'localhost');
    expect(res.status).toBe(200);
    expect(res.body.scope).toBe('unknown');
    expect(res.body.tenantSlug).toBeNull();
    expect(res.body.basename).toBe('');
  });

  it('GET /api/public/routing-config includes canonical domain URLs', async () => {
    const res = await request(app).get('/api/public/routing-config').set('Host', 'localhost');
    expect(res.status).toBe(200);
    expect(res.body.wwwUrl).toBeDefined();
    expect(res.body.appUrl).toBeDefined();
    expect(res.body.platformUrl).toBeDefined();
    expect(res.body.apiBasePath).toBeDefined();
    expect(['www', 'tenant', 'app']).toContain(res.body.scope);
    expect(res.body.domains?.baseDomain).toBeDefined();
    expect(res.body.domains.baseDomain).not.toBe('example.org');
    expect(res.body.domains.reservedSubdomains).toContain('www');
    expect(res.body.domains.reservedSubdomains).toContain('app');
  });

  it('GET /:tenant/api/public/health resolves tenant scope', async () => {
    const res = await request(app)
      .get(tenantApiPath('/api/public/health'))
      .set('Host', 'localhost');
    expect(res.status).toBe(200);
    expect(res.body.scope).toBe('tenant');
    expect(res.body.tenantSlug).toBe(QA_TENANT_SLUG);
  });

  it('GET /:tenant/api/public/menu via tenantApi helper', async () => {
    const res = await tenantApi(app).get(`/api/public/menu?eventId=${QA_EVENT_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
  });
});
