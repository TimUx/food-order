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
  website: string | null;
  activatedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  stats?: {
    activeUsers: number;
    events: number;
    activeEvents: number;
    modules: number;
    ordersTotal: number;
  };
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

  createTenant: (token: string, data: Record<string, unknown>) =>
    platformRequest<PlatformTenant>('/tenants', { method: 'POST', body: JSON.stringify(data) }, token),

  updateTenant: (token: string, id: string, data: Record<string, unknown>) =>
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
      tenant: { id: string; name: string; slug: string };
      redirectTo: string;
    }>(`/tenants/${tenantId}/impersonate`, { method: 'POST' }, token),

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
};

export const PLATFORM_TOKEN_KEY = 'fm_platform_token';
export const PLATFORM_REFRESH_KEY = 'fm_platform_refresh_token';
export const IMPERSONATION_META_KEY = 'fm_impersonation_meta';
export const PLATFORM_SESSION_BACKUP_KEY = 'fm_platform_session_backup';
