import { describe, it, expect, beforeAll } from 'vitest';
import { tenantApi, createTestApp } from './setup';
import type { Express } from 'express';

describe('API /health', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  it('returns ok status', async () => {
    const res = await tenantApi(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});
