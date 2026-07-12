import { test, expect } from '@playwright/test';

const QA_TENANT_SLUG = process.env.QA_TENANT_SLUG || 'default';

test.describe('Canonical routing (localhost)', () => {
  test('localhost root resolves to tenant or www scope via API', async ({ request }) => {
    const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';
    const res = await request.get(`${apiBase}/api/public/routing-config`, {
      headers: { Host: 'localhost' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(['www', 'tenant', 'app']).toContain(body.scope);
    expect(body.wwwUrl).toBeDefined();
    expect(body.appUrl).toBeDefined();
    expect(body.apiBasePath).toBeDefined();
  });

  test('localhost with /platform frontend path resolves to app scope', async ({ request }) => {
    const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';
    const res = await request.get(`${apiBase}/api/public/routing-config`, {
      headers: { Host: 'localhost' },
      params: { frontendPath: '/platform' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.scope).toBe('app');
  });

  test('path prefix /:tenant/public resolves to tenant scope', async ({ request }) => {
    const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';
    const res = await request.get(`${apiBase}/api/public/routing-config`, {
      headers: { Host: 'localhost' },
      params: { frontendPath: `/${QA_TENANT_SLUG}/public` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.scope).toBe('tenant');
    expect(body.tenantSlug).toBe(QA_TENANT_SLUG);
    expect(body.basename).toBe(`/${QA_TENANT_SLUG}`);
    expect(body.apiBasePath).toBe(`/${QA_TENANT_SLUG}/api`);
  });

  test('tenant API health via path prefix', async ({ request }) => {
    const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3001';
    const res = await request.get(`${apiBase}/${QA_TENANT_SLUG}/api/public/health`, {
      headers: { Host: 'localhost' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.scope).toBe('tenant');
    expect(body.tenantSlug).toBe(QA_TENANT_SLUG);
  });
});
