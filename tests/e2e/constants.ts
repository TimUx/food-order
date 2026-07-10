/** Plattform-Marketing (www) – mit MULTI_TENANT_ENABLED auf localhost. */
export const PLATFORM_BASE = process.env.QA_FRONTEND_BASE || 'http://localhost:5173';

/** Default-Mandant aus Seed (subdomain „default“). */
export const TENANT_BASE = process.env.QA_TENANT_FRONTEND_BASE || 'http://default.localhost:5173';
