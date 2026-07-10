import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, tenantApi } from './setup';
import { QA_USERS } from '../fixtures/constants';
import type { Express } from 'express';

describe('API /auth v2.1', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  it('GET /public/auth-config returns auth modes', async () => {
    const res = await tenantApi(app).get('/api/public/auth-config');
    expect(res.status).toBe(200);
    expect(res.body.mode).toBeDefined();
    expect(typeof res.body.passwordEnabled).toBe('boolean');
  });

  it('magic-link request returns sent:true without enumeration', async () => {
    const res = await tenantApi(app)
      .post('/api/auth/magic-link')
      .send({ email: 'unknown@example.test', loginPath: '/admin/login' });
    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(true);
  });

  it('login-code request returns sent:true', async () => {
    const res = await tenantApi(app)
      .post('/api/auth/login-code')
      .send({ email: QA_USERS.admin.email });
    expect(res.status).toBe(200);
    expect(res.body.sent).toBe(true);
  });

  it('verify invalid magic link returns 401', async () => {
    const res = await tenantApi(app)
      .post('/api/auth/verify-magic-link')
      .send({ token: 'invalid-token-value' });
    expect(res.status).toBe(401);
  });

  it('password login still works in password_or_magic mode', async () => {
    const res = await tenantApi(app).post('/api/auth/login').send(QA_USERS.admin);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});

describe('API /setup', () => {
  let app: Express;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    const login = await tenantApi(app).post('/api/auth/login').send(QA_USERS.admin);
    adminToken = login.body.token;
  });

  it('GET /setup/status returns setup state', async () => {
    const res = await tenantApi(app)
      .get('/api/setup/status')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.completed).toBe('boolean');
  });
});
