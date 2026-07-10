import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import supertest from 'supertest';

const request = typeof supertest === 'function'
  ? supertest
  : (supertest as unknown as { default: typeof supertest }).default;
import type { Express } from 'express';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../backend');
process.chdir(backendRoot);
dotenv.config({ path: path.join(backendRoot, '.env') });

// API tests use in-process supertest — ensure tenant resolves on localhost.
process.env.MULTI_TENANT_ENABLED = process.env.MULTI_TENANT_ENABLED ?? 'false';
process.env.PLATFORM_BASE_DOMAIN = process.env.PLATFORM_BASE_DOMAIN ?? 'localhost';

export const BACKEND_ROOT = backendRoot;
export const QA_TENANT_HOST = 'default.localhost';

/** Supertest helper with Host header for default-tenant API routes. */
export function tenantApi(app: Express) {
  return request(app).set('Host', QA_TENANT_HOST).set('X-Forwarded-Host', QA_TENANT_HOST);
}

export async function createTestApp() {
  const mod = await import(path.join(backendRoot, 'src/app.ts'));
  await mod.bootstrapApp();
  return mod.default;
}
