import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, tenantApi } from './setup';
import { QA_USERS } from '../fixtures/constants';
import type { Express } from 'express';

describe('API /auth', () => {
  let app: Express;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    const login = await tenantApi(app)
      .post('/api/auth/login')
      .send(QA_USERS.admin);
    adminToken = login.body.token;
  });

  it('login returns token for admin', async () => {
    const res = await tenantApi(app).post('/api/auth/login').send(QA_USERS.admin);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(QA_USERS.admin.email);
  });

  it('rejects invalid credentials', async () => {
    const res = await tenantApi(app)
      .post('/api/auth/login')
      .send({ email: QA_USERS.admin.email, password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('GET /auth/me returns user with valid token', async () => {
    const res = await tenantApi(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(QA_USERS.admin.email);
  });
});
