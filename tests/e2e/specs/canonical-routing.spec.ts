import { test, expect } from '@playwright/test';

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
});
