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

  it('POST /api/public/tenant-applications validates input', async () => {
    const res = await request(app)
      .post('/api/public/tenant-applications')
      .set('Host', 'localhost')
      .send({ organization: 'X' });
    expect(res.status).toBe(400);
  });
});
