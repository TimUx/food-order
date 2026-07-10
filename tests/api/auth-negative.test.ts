import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, tenantApi } from './setup';
import { QA_USERS } from '../fixtures/constants';
import type { Express } from 'express';

describe('API auth — negative cases', () => {
  let app: Express;
  let staffToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    const login = await tenantApi(app)
      .post('/api/auth/login')
      .send(QA_USERS.kitchen);
    staffToken = login.body.token;
    refreshToken = login.body.refreshToken;
  });

  it('protected route without token returns 401', async () => {
    const res = await tenantApi(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('staff route with wrong role returns 403', async () => {
    const res = await tenantApi(app)
      .get('/api/staff/club')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it('revoked session returns 401', async () => {
    expect(refreshToken).toBeTruthy();
    await tenantApi(app)
      .post('/api/auth/logout')
      .send({ refreshToken });

    const res = await tenantApi(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(401);
  });
});
