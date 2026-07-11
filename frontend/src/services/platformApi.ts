const API_URL = import.meta.env.VITE_API_URL || '';

export interface PlatformUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'PLATFORM_ADMIN';
  permissions: string[];
  lastLoginAt?: string | null;
  mfaEnabled?: boolean;
}

export interface TenantApplication {
  id: string;
  organization: string;
  organizationType: string;
  contactName: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string | null;
  website: string | null;
  memberCount: number | null;
  eventsPerYear: number | null;
  reason: string;
  desiredFeatures: string;
  freeTierJustification: string;
  plannedUsage: string;
  notes: string | null;
  requestedSubdomain: string;
  status: string;
  adminComment: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformLegalPageAdmin {
  id: string;
  pageType: string;
  title: string;
  slug: string;
  enabled: boolean;
  published: boolean;
  contentHtml: string;
}

export interface PlatformDomainsInfo {
  baseDomain: string;
  platformDomain: string;
  wwwSubdomain: string;
  wwwDomain: string;
  appSubdomain: string;
  appDomain: string;
  apiSubdomain: string;
  apiDomain: string | null;
  docsSubdomain: string | null;
  docsDomain: string | null;
  statusSubdomain: string | null;
  statusDomain: string | null;
  wildcardDomain: string;
  tenantDomainPattern: string;
  cookieDomain: string | null;
  sessionDomain: string | null;
  reservedSubdomains?: string[];
  allowedDomains?: string[];
  allowedOrigins?: string[];
  source: 'infrastructure';
  note?: string;
}

export interface PlatformTenant {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  subdomain: string;
  status: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
  locale: string;
  timezone: string;
  currency: string;
  theme: string;
  description: string | null;
  address: string | null;
  website: string | null;
  activatedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt?: string;
  stats?: {
    activeUsers: number;
    events: number;
    activeEvents: number;
    modules: number;
    ordersTotal: number;
  };
}

export interface UpdatePlatformTenantPayload {
  name?: string;
  shortName?: string | null;
  slug?: string;
  subdomain?: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  locale?: string;
  timezone?: string;
  currency?: string;
  theme?: string;
}

async function platformRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${API_URL}/api/platform${path}`;
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Anfrage fehlgeschlagen' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const platformApi = {
  login: (email: string, password: string) =>
    platformRequest<{ token: string; refreshToken?: string; user: PlatformUser }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  logout: (refreshToken: string) =>
    platformRequest<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  me: (token: string) => platformRequest<PlatformUser>('/auth/me', {}, token),

  getDashboard: (token: string) => platformRequest<Record<string, unknown>>('/dashboard', {}, token),

  getMonitoring: (token: string) => platformRequest<Record<string, unknown>>('/monitoring', {}, token),

  getHealth: (token: string) => platformRequest<Record<string, unknown>>('/health', {}, token),

  listTenants: (token: string, params?: { search?: string; status?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    const qs = q.toString();
    return platformRequest<{ items: PlatformTenant[]; total: number }>(
      `/tenants${qs ? `?${qs}` : ''}`,
      {},
      token
    );
  },

  getTenant: (token: string, id: string) =>
    platformRequest<PlatformTenant>(`/tenants/${id}`, {}, token),

  createTenant: (token: string, data: UpdatePlatformTenantPayload & { name: string; slug: string; subdomain: string }) =>
    platformRequest<PlatformTenant>('/tenants', { method: 'POST', body: JSON.stringify(data) }, token),

  updateTenant: (token: string, id: string, data: UpdatePlatformTenantPayload) =>
    platformRequest<PlatformTenant>(`/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),

  activateTenant: (token: string, id: string) =>
    platformRequest<PlatformTenant>(`/tenants/${id}/activate`, { method: 'POST' }, token),

  suspendTenant: (token: string, id: string) =>
    platformRequest<PlatformTenant>(`/tenants/${id}/suspend`, { method: 'POST' }, token),

  archiveTenant: (token: string, id: string) =>
    platformRequest<PlatformTenant>(`/tenants/${id}/archive`, { method: 'POST' }, token),

  deleteTenant: (token: string, id: string) =>
    platformRequest<void>(`/tenants/${id}`, { method: 'DELETE' }, token),

  exportTenant: (token: string, id: string) =>
    platformRequest<Record<string, unknown>>(`/tenants/${id}/export`, {}, token),

  impersonate: (token: string, tenantId: string) =>
    platformRequest<{
      token: string;
      tenant: { id: string; name: string; slug: string; subdomain: string };
      impersonation: { platformSessionId: string; tenantId: string; tenantName: string };
      redirectTo: string;
    }>(`/tenants/${tenantId}/impersonate`, { method: 'POST' }, token),

  endImpersonation: (token: string, platformSessionId: string) =>
    platformRequest<{ token: string }>(
      '/impersonation/end',
      { method: 'POST', body: JSON.stringify({ platformSessionId }) },
      token
    ),

  getSettings: (token: string) =>
    platformRequest<Record<string, unknown>>('/settings', {}, token),

  updateSettings: (token: string, data: Record<string, unknown>) =>
    platformRequest<Record<string, unknown>>('/settings', { method: 'PUT', body: JSON.stringify(data) }, token),

  listLogs: (token: string, params?: { limit?: number; tenantId?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.tenantId) q.set('tenantId', params.tenantId);
    const qs = q.toString();
    return platformRequest<{ items: Array<Record<string, unknown>> }>(
      `/logs${qs ? `?${qs}` : ''}`,
      {},
      token
    );
  },

  listUsers: (token: string) =>
    platformRequest<{ items: Array<Record<string, unknown>> }>('/users', {}, token),

  getBackups: (token: string) =>
    platformRequest<Record<string, unknown>>('/backups', {}, token),

  listApplications: (token: string, params?: { search?: string; status?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    const qs = q.toString();
    return platformRequest<{ items: TenantApplication[]; total: number }>(
      `/applications${qs ? `?${qs}` : ''}`,
      {},
      token
    );
  },

  getApplication: (token: string, id: string) =>
    platformRequest<TenantApplication>(`/applications/${id}`, {}, token),

  updateApplicationStatus: (token: string, id: string, status: string, adminComment?: string) =>
    platformRequest<TenantApplication>(`/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, adminComment }),
    }, token),

  approveApplication: (token: string, id: string, options?: { createTenant?: boolean; adminComment?: string }) =>
    platformRequest<{ application: TenantApplication; tenantId?: string }>(`/applications/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(options ?? {}),
    }, token),

  rejectApplication: (token: string, id: string, adminComment?: string) =>
    platformRequest<TenantApplication>(`/applications/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ adminComment }),
    }, token),

  archiveApplication: (token: string, id: string) =>
    platformRequest<TenantApplication>(`/applications/${id}/archive`, { method: 'POST' }, token),

  listLegalPages: (token: string) =>
    platformRequest<{ items: PlatformLegalPageAdmin[] }>('/legal-pages', {}, token),

  updateLegalPage: (token: string, pageType: string, data: Partial<PlatformLegalPageAdmin>) =>
    platformRequest<PlatformLegalPageAdmin>(`/legal-pages/${pageType}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),

  getDomains: (token: string) =>
    platformRequest<PlatformDomainsInfo>('/domains', {}, token),

  getMailConfig: (token: string) =>
    platformRequest<{ smtp: Record<string, unknown>; auth: Record<string, unknown> }>('/mail', {}, token),

  updateMailSmtp: (token: string, data: Record<string, unknown>) =>
    platformRequest<Record<string, unknown>>('/mail/smtp', { method: 'PUT', body: JSON.stringify(data) }, token),

  updateMailAuth: (token: string, data: Record<string, unknown>) =>
    platformRequest<Record<string, unknown>>('/mail/auth', { method: 'PUT', body: JSON.stringify(data) }, token),

  testMailConnection: (token: string) =>
    platformRequest<{ ok: boolean; message: string }>('/mail/test-connection', { method: 'POST' }, token),

  sendTestMail: (token: string, recipient: string) =>
    platformRequest<{ ok: boolean }>('/mail/test', { method: 'POST', body: JSON.stringify({ recipient }) }, token),

  getMailQueueStatus: (token: string) =>
    platformRequest<{ pending: number; sent: number; failed: number; total: number; lastSentAt: string | null }>(
      '/mail/queue',
      {},
      token
    ),
};

export const PLATFORM_TOKEN_KEY = 'fm_platform_token';
export const PLATFORM_REFRESH_KEY = 'fm_platform_refresh_token';
export const IMPERSONATION_META_KEY = 'fm_impersonation_meta';
export const PLATFORM_SESSION_BACKUP_KEY = 'fm_platform_session_backup';
