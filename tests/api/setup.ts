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

// Pfad-basiertes Mandanten-Routing (v2.0): /default/api/… auf localhost
process.env.MULTI_TENANT_ENABLED = process.env.MULTI_TENANT_ENABLED ?? 'true';
process.env.PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN ?? 'localhost';
process.env.PLATFORM_BASE_DOMAIN = process.env.PLATFORM_BASE_DOMAIN ?? 'localhost';

export const BACKEND_ROOT = backendRoot;
export const QA_TENANT_SLUG = process.env.QA_TENANT_SLUG || 'default';
export const QA_TENANT_HOST = process.env.QA_TENANT_HOST || 'localhost';

const PLATFORM_API_PREFIXES = [
  '/api/platform',
  '/api/public/platform',
  '/api/health',
  '/api/public/routing-config',
  '/api/public/tenant-applications',
];

/** Mandanten-API-Pfad mit Slug-Präfix (v2.0). */
export function tenantApiPath(url: string): string {
  if (url.startsWith('http')) return url;
  if (/^\/[^/]+\/api\//.test(url)) return url;
  if (PLATFORM_API_PREFIXES.some((prefix) => url === prefix || url.startsWith(`${prefix}/`))) {
    return url;
  }
  return `/${QA_TENANT_SLUG}${url}`;
}

/** Supertest helper: localhost + Pfad-Präfix für Mandanten-APIs. */
export function tenantApi(app: Express) {
  const agent = request(app);
  const withHost = <T extends ReturnType<typeof agent.get>>(call: T): T =>
    call.set('Host', QA_TENANT_HOST).set('X-Forwarded-Host', QA_TENANT_HOST) as T;

  return {
    get: (url: string) => withHost(agent.get(tenantApiPath(url))),
    post: (url: string) => withHost(agent.post(tenantApiPath(url))),
    put: (url: string) => withHost(agent.put(tenantApiPath(url))),
    patch: (url: string) => withHost(agent.patch(tenantApiPath(url))),
    delete: (url: string) => withHost(agent.delete(tenantApiPath(url))),
  };
}

export async function createTestApp() {
  const mod = await import(path.join(backendRoot, 'src/app.ts'));
  await mod.bootstrapApp();
  return mod.default;
}
