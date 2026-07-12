/** Plattform-Marketing (www) – auf localhost ohne Mandanten-Pfad. */
export const PLATFORM_BASE = process.env.QA_FRONTEND_BASE || 'http://localhost:5173';

export const QA_TENANT_SLUG = process.env.QA_TENANT_SLUG || 'default';

/** Default-Mandant aus Seed – Pfad-basiert unter localhost. */
export const TENANT_BASE =
  process.env.QA_TENANT_FRONTEND_BASE || `http://localhost:5173/${QA_TENANT_SLUG}`;

export const TENANT_HOST = process.env.QA_TENANT_HOST || 'localhost';
