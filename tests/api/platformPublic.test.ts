import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import type { Express } from 'express';
import { createTestApp } from './setup';

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

  it('GET /api/public/routing-config includes canonical domain URLs', async () => {
    const res = await request(app).get('/api/public/routing-config').set('Host', 'localhost');
    expect(res.status).toBe(200);
    expect(res.body.wwwUrl).toBeDefined();
    expect(res.body.appUrl).toBeDefined();
    expect(res.body.platformUrl).toBeDefined();
    expect(['www', 'tenant', 'app']).toContain(res.body.scope);
    expect(res.body.domains?.baseDomain).toBeDefined();
    expect(res.body.domains.baseDomain).not.toBe('festmanager.org');
    expect(res.body.domains.reservedSubdomains).toContain('www');
    expect(res.body.domains.reservedSubdomains).toContain('app');
  });
});
