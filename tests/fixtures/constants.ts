/** Gemeinsame Test-Konstanten für API-, E2E- und Integrationstests. */
export const QA_USERS = {
  admin: { email: 'admin@verein.local', password: 'admin123' },
  kitchen: { email: 'kueche@verein.local', password: 'staff123' },
  cashier: { email: 'kasse@verein.local', password: 'staff123' },
} as const;

export const QA_TENANT_SLUG = process.env.QA_TENANT_SLUG || 'default';

export const QA_API_BASE =
  process.env.QA_API_BASE || `http://localhost:3001/${QA_TENANT_SLUG}/api`;
export const QA_FRONTEND_BASE = process.env.QA_FRONTEND_BASE || 'http://localhost:5173';

export const QA_EVENT_ID = '00000000-0000-0000-0000-000000000001';
