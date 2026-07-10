import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, tenantApi } from '../api/setup';
import { QA_USERS, QA_EVENT_ID } from '../fixtures/constants';
import type { Express } from 'express';

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)('API integration', () => {
  let app: Express;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    const login = await tenantApi(app).post('/api/auth/login').send(QA_USERS.admin);
    adminToken = login.body.token;
  });

  it('lists events for staff', async () => {
    const res = await tenantApi(app)
      .get('/api/staff/events')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns public menu', async () => {
    const res = await tenantApi(app).get('/api/public/menu');
    expect(res.status).toBe(200);
    expect(res.body.event).toBeDefined();
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('admin modules endpoint is reachable', async () => {
    const res = await tenantApi(app)
      .get('/api/admin/modules')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('settings namespaces are listed', async () => {
    const res = await tenantApi(app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('API constants', () => {
  it('uses stable QA event id', () => {
    expect(QA_EVENT_ID).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('exposes tenant-scoped API helper', () => {
    expect(typeof tenantApi).toBe('function');
  });
});
