import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, tenantApi } from './setup';
import { QA_USERS, QA_EVENT_ID } from '../fixtures/constants';
import type { Express } from 'express';

describe('API authorization matrix — tenant role templates', () => {
  let app: Express;
  let kasseToken: string;
  let kitchenToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    const kasseLogin = await tenantApi(app)
      .post('/api/auth/login')
      .send(QA_USERS.cashier);
    kasseToken = kasseLogin.body.token;

    const kitchenLogin = await tenantApi(app)
      .post('/api/auth/login')
      .send(QA_USERS.kitchen);
    kitchenToken = kitchenLogin.body.token;
  });

  it('Kasse kann aktive Veranstaltung lesen', async () => {
    const res = await tenantApi(app)
      .get('/api/staff/events/active')
      .set('Authorization', `Bearer ${kasseToken}`);
    expect(res.status).toBe(200);
  });

  it('Kasse kann keine Team-Verwaltung aufrufen', async () => {
    const res = await tenantApi(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${kasseToken}`);
    expect(res.status).toBe(403);
  });

  it('Kasse kann keine Payment-Settings ändern', async () => {
    const res = await tenantApi(app)
      .put('/api/admin/settings/module.payment')
      .set('Authorization', `Bearer ${kasseToken}`)
      .send({ allowCashOnSite: true });
    expect(res.status).toBe(403);
  });

  it('Küche kann Bestellungen lesen, aber keine Veranstalter-Einstellungen', async () => {
    const orders = await tenantApi(app)
      .get(`/api/staff/events/${QA_EVENT_ID}/orders`)
      .set('Authorization', `Bearer ${kitchenToken}`);
    expect(orders.status).toBe(200);

    const club = await tenantApi(app)
      .get('/api/staff/club')
      .set('Authorization', `Bearer ${kitchenToken}`);
    expect(club.status).toBe(403);
  });

  it('Kasse kann keine Benutzer-Rechte ändern', async () => {
    const res = await tenantApi(app)
      .put('/api/admin/users/00000000-0000-0000-0000-000000000099/permissions')
      .set('Authorization', `Bearer ${kasseToken}`)
      .send({ permissions: ['team.manage'], roleTemplate: 'kasse' });
    expect(res.status).toBe(403);
  });
});
