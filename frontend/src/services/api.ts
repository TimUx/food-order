const API_URL = import.meta.env.VITE_API_URL || '';

import type { RateLimitInfo } from '@/utils/rateLimitMessage';
import { parseRateLimitInfo } from '@/utils/rateLimitMessage';

let apiBasePath = '/api';

export function configureApiBase(path: string): void {
  apiBasePath = path.startsWith('/') ? path : `/${path}`;
}

export function getApiBasePath(): string {
  return apiBasePath;
}

/** Volle API-URL inkl. Mandanten-Pfad-Präfix (für FormData/Blob-Downloads). */
export function buildApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${apiBasePath}${normalized}`;
}

type AuthRefreshHandlers = {
  getRefreshToken: () => string | null;
  onTokensRefreshed: (accessToken: string, refreshToken?: string) => void;
  onAuthFailed: () => void;
};

let authRefreshHandlers: AuthRefreshHandlers | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function configureAuthRefresh(handlers: AuthRefreshHandlers): void {
  authRefreshHandlers = handlers;
}


class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Array<{ field: string; message: string }>,
    public rateLimit?: RateLimitInfo
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = RequestInit & { _skipRefresh?: boolean };

async function tryRefreshToken(): Promise<string | null> {
  if (!authRefreshHandlers) return null;
  const refreshToken = authRefreshHandlers.getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const result = await request<{ token: string; refreshToken?: string }>(
          '/auth/refresh',
          { method: 'POST', body: JSON.stringify({ refreshToken }), _skipRefresh: true }
        );
        authRefreshHandlers?.onTokensRefreshed(result.token, result.refreshToken);
        return result.token;
      } catch {
        authRefreshHandlers?.onAuthFailed();
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = path.startsWith('http') ? path : buildApiUrl(path);
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && token && !options._skipRefresh) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      return request<T>(path, { ...options, _skipRefresh: true }, newToken);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unbekannter Fehler' }));
    const details = Array.isArray(body.details)
      ? body.details as Array<{ field: string; message: string }>
      : undefined;
    const message = details?.length
      ? details.map((d) => d.message).join(' ')
      : body.error || 'Anfrage fehlgeschlagen';
    const rateLimit = res.status === 429 ? parseRateLimitInfo(res.headers) : undefined;
    throw new ApiError(res.status, message, details, rateLimit);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Public
  getPublicEvents: () => request<import('@/types').PublicEvent[]>('/public/events'),
  getPublicPickupEvents: () => request<import('@/types').PublicEvent[]>('/public/events/pickup'),
  getPublicEvent: () => request<{ id: string; name: string; onlineOrdersActive: boolean; ordersClosed: boolean }>('/public/event'),
  getPublicMenu: (eventId: string) =>
    request<{ event: Event; items: FoodItem[] }>(`/public/menu?eventId=${encodeURIComponent(eventId)}`),
  createOrder: (data: {
    eventId: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    items: { foodItemId: string; quantity: number }[];
    paymentMethodId?: string;
    formStartedAt: number;
    _hp?: string;
    turnstileToken?: string;
  }) => request<Order>('/public/orders', { method: 'POST', body: JSON.stringify(data) }),
  lookupOrder: (eventId: string, orderNumber: number, lastName: string) =>
    request<Order>('/public/orders/lookup', {
      method: 'POST',
      body: JSON.stringify({ eventId, orderNumber, lastName }),
    }),
  getOrderByToken: (lookupToken: string, lastName: string) => {
    const q = new URLSearchParams({ lastName });
    return request<Order>(`/public/orders/status/${encodeURIComponent(lookupToken)}?${q}`);
  },
  createOrderCheckout: (orderId: string, paymentMethodId: string) =>
    request<import('@/types/payment').OrderPaymentInfo>(
      `/public/orders/${orderId}/checkout`,
      { method: 'POST', body: JSON.stringify({ paymentMethodId }) }
    ),
  cancelOrder: (lookupToken: string, lastName: string) =>
    request<Order>(`/public/orders/${encodeURIComponent(lookupToken)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ lastName }),
    }),
  getPickupBoard: (eventId: string) =>
    request<PickupBoardOrder[]>(`/public/pickup-board?eventId=${encodeURIComponent(eventId)}`),
  getClub: () => request<import('@/types/club').ClubSettings>('/public/club'),
  getTenant: () => request<import('@/types/tenant').TenantPublicData>('/public/tenant'),
  getPlatform: () =>
    request<import('@/types/tenant').PlatformPublicData>('/public/platform'),
  getPlatformLegalLinks: () =>
    request<{ items: import('@/types/tenant').PlatformLegalLink[] }>('/public/platform/legal-links'),
  getPlatformLegalPage: (slug: string) =>
    request<import('@/types/tenant').PlatformLegalPage>(`/public/platform/legal/${encodeURIComponent(slug)}`),
  submitTenantApplication: (data: import('@/types/tenant').TenantApplicationInput) =>
    request<{ id: string }>('/public/tenant-applications', { method: 'POST', body: JSON.stringify(data) }),
  getRoutingConfig: () =>
    request<import('@/types/routing').RoutingConfig>('/public/routing-config'),
  getOrderSettings: () => request<import('@/types/club').OrderSettings>('/public/order-settings'),

  // Auth
  getAuthConfig: () =>
    request<{ mode: string; passwordEnabled: boolean; magicLinkEnabled: boolean; loginCodeEnabled: boolean }>(
      '/public/auth-config'
    ),
  login: (identifier: string, password: string) =>
    request<{ token: string; refreshToken?: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  requestMagicLink: (email: string, loginPath?: string) =>
    request<{ sent: boolean }>('/auth/magic-link', { method: 'POST', body: JSON.stringify({ email, loginPath }) }),
  requestLoginCode: (email: string) =>
    request<{ sent: boolean }>('/auth/login-code', { method: 'POST', body: JSON.stringify({ email }) }),
  requestPasswordReset: (identifier: string, loginPath?: string) =>
    request<{ sent: boolean }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ identifier, loginPath }) }),
  resetPassword: (token: string, newPassword: string) =>
    request<{ success: boolean }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
  verifyMagicLink: (token: string) =>
    request<{ token: string; refreshToken?: string; user: User }>('/auth/verify-magic-link', { method: 'POST', body: JSON.stringify({ token }) }),
  verifyLoginCode: (email: string, code: string) =>
    request<{ token: string; refreshToken?: string; user: User }>('/auth/verify-login-code', { method: 'POST', body: JSON.stringify({ email, code }) }),
  refresh: (refreshToken: string) =>
    request<{ token: string; refreshToken?: string }>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  logout: (refreshToken: string) =>
    request<void>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  me: (token: string) => request<User>('/auth/me', {}, token),
  updateProfile: (token: string, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    username?: string | null;
    passwordEnabled?: boolean;
    magicLinkEnabled?: boolean;
    notificationEmailsEnabled?: boolean;
    currentPassword?: string;
    newPassword?: string;
  }) => request<User>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }, token),

  // Staff
  getEvents: (token: string) => request<Event[]>('/staff/events', {}, token),
  getCashierEvents: (token: string) => request<import('@/types').PublicEvent[]>('/staff/events/cashier', {}, token),
  getPickupEvents: (token: string) => request<import('@/types').PublicEvent[]>('/staff/events/pickup', {}, token),
  getActiveEvent: (token: string) => request<Event>('/staff/events/active', {}, token),
  createEvent: (token: string, data: CreateEventInput) =>
    request<Event>('/staff/events', { method: 'POST', body: JSON.stringify(data) }, token),
  updateEvent: (token: string, id: string, data: Partial<Event>) =>
    request<Event>(`/staff/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  deleteEvent: (token: string, id: string) =>
    request<void>(`/staff/events/${id}`, { method: 'DELETE' }, token),
  activateEvent: (token: string, id: string) =>
    request<Event>(`/staff/events/${id}/activate`, { method: 'POST' }, token),

  getFoodCatalog: (token: string) =>
    request<FoodItem[]>('/staff/food-items', {}, token),
  createFoodCatalogItem: (token: string, data: Partial<FoodItem>) =>
    request<FoodItem>('/staff/food-items', { method: 'POST', body: JSON.stringify(data) }, token),
  getFoodItems: (token: string, eventId: string) =>
    request<FoodItem[]>(`/staff/events/${eventId}/food-items`, {}, token),
  getEventFoodAssignments: (token: string, eventId: string) =>
    request<FoodItem[]>(`/staff/events/${eventId}/food-item-assignments`, {}, token),
  setEventFoodAssignments: (token: string, eventId: string, foodItemIds: string[]) =>
    request<FoodItem[]>(`/staff/events/${eventId}/food-item-assignments`, {
      method: 'PUT',
      body: JSON.stringify({ foodItemIds }),
    }, token),
  createFoodItem: (token: string, eventId: string, data: Partial<FoodItem>) =>
    request<FoodItem>(`/staff/events/${eventId}/food-items`, { method: 'POST', body: JSON.stringify(data) }, token),
  updateFoodItem: (token: string, id: string, data: Partial<FoodItem>) =>
    request<FoodItem>(`/staff/food-items/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  setFoodSoldOut: (token: string, id: string, soldOut: boolean, eventId?: string) =>
    request<FoodItem>(`/staff/food-items/${id}/sold-out`, {
      method: 'PATCH',
      body: JSON.stringify({ soldOut, eventId }),
    }, token),
  deleteFoodItem: (token: string, id: string) =>
    request<void>(`/staff/food-items/${id}`, { method: 'DELETE' }, token),
  uploadFoodImage: async (token: string, id: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const url = buildApiUrl(`/staff/food-items/${id}/image`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Upload fehlgeschlagen' }));
      throw new ApiError(res.status, body.error);
    }
    return res.json() as Promise<FoodItem>;
  },

  getOrders: (token: string, eventId: string, status?: string, kitchenOnly?: boolean) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (kitchenOnly) params.set('kitchenOnly', '1');
    const q = params.toString();
    return request<Order[]>(`/staff/events/${eventId}/orders${q ? `?${q}` : ''}`, {}, token);
  },
  getOrdersExport: (token: string, eventId: string) =>
    request<import('@/types/ordersExport').EventOrdersExport>(`/staff/events/${eventId}/orders/export`, {}, token),
  downloadOrdersExport: async (token: string, eventId: string, filename: string) => {
    const url = buildApiUrl(`/staff/events/${eventId}/orders/export.xlsx`);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new ApiError(res.status, 'Export fehlgeschlagen');
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },
  getStats: (token: string, eventId: string) =>
    request<DashboardStats>(`/staff/events/${eventId}/stats`, {}, token),
  createCashierOrder: (
    token: string,
    eventId: string,
    items: { foodItemId: string; quantity: number }[],
    paymentMethodId?: string
  ) =>
    request<Order>('/staff/orders/cashier', {
      method: 'POST',
      body: JSON.stringify({ eventId, items, paymentMethodId }),
    }, token),
  abortCashierPayment: (token: string, orderId: string, sessionId: string) =>
    request<Order>(`/staff/orders/${orderId}/abort-payment`, { method: 'POST', body: JSON.stringify({ sessionId }) }, token),
  lookupOrderByNumber: (token: string, eventId: string, orderNumber: number, lastName?: string) =>
    request<Order>(
      '/staff/orders/lookup',
      { method: 'POST', body: JSON.stringify({ eventId, orderNumber, ...(lastName ? { lastName } : {}) }) },
      token
    ),
  updateOrderStatus: (token: string, id: string, status: OrderStatus) =>
    request<Order>(`/staff/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
  updateOrderItems: (token: string, id: string, items: { foodItemId: string; quantity: number }[]) =>
    request<Order>(`/staff/orders/${id}/items`, { method: 'PATCH', body: JSON.stringify({ items }) }, token),
  advanceOrder: (token: string, id: string) =>
    request<Order>(`/staff/orders/${id}/advance`, { method: 'POST' }, token),
  releaseOrderToKitchen: (token: string, id: string) =>
    request<Order>(`/staff/orders/${id}/release-to-kitchen`, { method: 'POST' }, token),

  // Realtime sync (delta/ETag)
  syncEventOrders: (token: string, eventId: string, status?: string, etag?: string, kitchenOnly?: boolean) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (kitchenOnly) params.set('kitchenOnly', '1');
    if (etag) params.set('etag', etag);
    const q = params.toString();
    return request<SyncResult<Order[]>>(`/realtime/events/${eventId}/orders${q ? `?${q}` : ''}`, {}, token);
  },
  syncEventStats: (token: string, eventId: string, etag?: string) => {
    const q = etag ? `?etag=${encodeURIComponent(etag)}` : '';
    return request<SyncResult<DashboardStats>>(`/realtime/events/${eventId}/stats${q}`, {}, token);
  },
  syncPickupBoard: (eventId: string, etag?: string) => {
    const params = new URLSearchParams({ eventId });
    if (etag) params.set('etag', etag);
    return request<SyncResult<PickupBoardOrder[]>>(`/realtime/pickup-board?${params.toString()}`, {});
  },
  syncOrder: (lookupToken: string, lastName: string | undefined, etag?: string) => {
    const params = new URLSearchParams();
    if (lastName) params.set('lastName', lastName);
    if (etag) params.set('etag', etag);
    const q = params.toString();
    return request<SyncResult<Order>>(`/realtime/orders/${lookupToken}${q ? `?${q}` : ''}`, {});
  },
  syncPaymentStatus: (sessionId: string, etag?: string) => {
    const q = etag ? `?etag=${encodeURIComponent(etag)}` : '';
    return request<SyncResult<OrderPaymentInfo>>(`/realtime/payment/${sessionId}${q}`, {});
  },
  syncClub: (etag?: string) => {
    const q = etag ? `?etag=${encodeURIComponent(etag)}` : '';
    return request<SyncResult<import('@/types/club').ClubSettings>>(`/realtime/club${q}`, {});
  },

  getClubSettings: (token: string) =>
    request<import('@/types/club').ClubSettings>('/admin/club', {}, token),

  // Initial Setup Wizard
  getSetupStatus: (token: string) =>
    request<{ completed: boolean; currentStep: number; data: Record<string, unknown> }>('/setup/status', {}, token),
  saveSetupStep: (token: string, step: number, data: Record<string, unknown>) =>
    request<{ completed: boolean; currentStep: number; data: Record<string, unknown> }>(
      '/setup/step',
      { method: 'POST', body: JSON.stringify({ step, data }) },
      token
    ),
  completeSetup: (token: string, data: Record<string, unknown>) =>
    request<{ completed: boolean; currentStep: number; data: Record<string, unknown> }>(
      '/setup/complete',
      { method: 'POST', body: JSON.stringify({ data }) },
      token
    ),
  resetSetup: (token: string) =>
    request<{ completed: boolean; currentStep: number; data: Record<string, unknown> }>(
      '/setup/reset',
      { method: 'POST' },
      token
    ),

  updateClubSettings: (token: string, data: Partial<import('@/types/club').ClubSettings>) =>
    request<import('@/types/club').ClubSettings>('/admin/club', { method: 'PUT', body: JSON.stringify(data) }, token),
  getEmailSettings: (token: string) =>
    request<import('@/types/club').EmailSettings>('/admin/email-settings', {}, token),
  updateEmailSettings: (token: string, data: {
    smtpHost?: string | null;
    smtpPort?: number;
    smtpUser?: string | null;
    smtpPass?: string | null;
    smtpFrom?: string | null;
    emailCustomText?: string | null;
  }) =>
    request<import('@/types/club').EmailSettings>('/admin/email-settings', { method: 'PUT', body: JSON.stringify(data) }, token),
  uploadClubLogo: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const url = buildApiUrl('/admin/club/logo');
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Upload fehlgeschlagen' }));
      throw new ApiError(res.status, body.error);
    }
    return res.json() as Promise<import('@/types/club').ClubSettings>;
  },
  updateClubBrandColor: (token: string, brandColor: string) =>
    request<{ theme: string }>('/admin/club/brand-color', { method: 'PUT', body: JSON.stringify({ brandColor }) }, token),

  getUsers: (token: string) => request<User[]>('/admin/users', {}, token),
  createUser: (token: string, data: {
    email?: string;
    username?: string;
    password?: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    roleTemplate?: import('@/types').RoleTemplateId;
    roleTemplates?: import('@/types').RoleTemplateId[];
    passwordEnabled?: boolean;
    magicLinkEnabled?: boolean;
    notificationEmailsEnabled?: boolean;
  }) => request<User>('/admin/users', { method: 'POST', body: JSON.stringify(data) }, token),
  updateUser: (token: string, id: string, data: {
    email?: string | null;
    username?: string | null;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    active?: boolean;
    passwordEnabled?: boolean;
    magicLinkEnabled?: boolean;
    notificationEmailsEnabled?: boolean;
  }) => request<User>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),

  getModules: (token: string) =>
    request<import('@/module-system').ModuleInfo[]>('/admin/modules', {}, token),
  installModule: (token: string, id: string) =>
    request<import('@/module-system').ModuleInfo>(`/admin/modules/${id}/install`, { method: 'POST' }, token),
  uninstallModule: (token: string, id: string) =>
    request<import('@/module-system').ModuleInfo>(`/admin/modules/${id}/uninstall`, { method: 'POST' }, token),
  activateModule: (token: string, id: string) =>
    request<import('@/module-system').ModuleInfo>(`/admin/modules/${id}/activate`, { method: 'POST' }, token),
  deactivateModule: (token: string, id: string) =>
    request<import('@/module-system').ModuleInfo>(`/admin/modules/${id}/deactivate`, { method: 'POST' }, token),
  reinitializeModule: (token: string, id: string) =>
    request<import('@/module-system').ModuleInfo>(`/admin/modules/${id}/reinitialize`, { method: 'POST' }, token),
  runModuleHealthCheck: (token: string, id: string) =>
    request<import('@/module-system').ModuleHealthResult>(`/admin/modules/${id}/health`, {}, token),
  upgradeModule: (token: string, id: string) =>
    request<import('@/module-system').ModuleInfo>(`/admin/modules/${id}/upgrade`, { method: 'POST' }, token),
  enableModule: (token: string, id: string) =>
    request<import('@/module-system').ModuleInfo>(`/admin/modules/${id}/enable`, { method: 'POST' }, token),
  disableModule: (token: string, id: string) =>
    request<import('@/module-system').ModuleInfo>(`/admin/modules/${id}/disable`, { method: 'POST' }, token),
  getModuleConfig: (token: string, id: string) =>
    request<Record<string, unknown>>(`/admin/modules/${id}/config`, {}, token),
  updateModuleConfig: (token: string, id: string, config: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/admin/modules/${id}/config`, { method: 'PUT', body: JSON.stringify(config) }, token),
  getPublicModuleMenu: () =>
    request<import('@/module-system').ModuleMenuItem[]>('/public/modules/menu'),
  getPublicLegalLinks: () =>
    request<{ links: import('@/types/legal').PublicLegalLink[] }>('/public/legal-links'),
  getPublicLegalPage: (slug: string) =>
    request<import('@/types/legal').PublicLegalPage>(`/public/legal/${encodeURIComponent(slug)}`),
  getPaymentStatus: () =>
    request<{ available: boolean }>('/public/payment/status'),
  getPaymentMethods: () =>
    request<import('@/types/payment').PaymentMethodsResponse>('/public/payment/methods'),
  getPaymentCheckoutStatus: (sessionId: string) =>
    request<import('@/types/payment').PaymentStatusInfo>(`/public/payment/checkout/${sessionId}/status`),
  retryPaymentCheckout: (sessionId: string) =>
    request<import('@/types/payment').OrderPaymentInfo & { checkoutUrl: string; sessionId: string }>(
      `/public/payment/checkout/${sessionId}/retry`,
      { method: 'POST' }
    ),
  getAdminUi: (token: string) =>
    request<import('@/types/adminUi').AdminUiCatalog>('/admin/ui', {}, token),
  getSettingsNamespaces: (token: string) =>
    request<import('@/types/settings').SettingsFormDefinition[]>('/admin/settings', {}, token),
  getSettingsForm: (token: string, namespace: string) =>
    request<import('@/types/settings').SettingsFormDefinition>(
      `/admin/settings/${encodeURIComponent(namespace)}/schema`,
      {},
      token
    ),
  getSettings: (token: string, namespace: string) =>
    request<Record<string, unknown>>(`/admin/settings/${encodeURIComponent(namespace)}`, {}, token),
  updateSettings: (token: string, namespace: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(
      `/admin/settings/${encodeURIComponent(namespace)}`,
      { method: 'PUT', body: JSON.stringify(data) },
      token
    ),
  testPaymentProvider: (token: string, providerId: string) =>
    request<{ ok: boolean; message?: string; checks?: Record<string, boolean | undefined> }>(
      `/modules/features/payment/admin/providers/${providerId}/test`,
      { method: 'POST' },
      token
    ),
  getPaymentDashboard: (token: string) =>
    request<import('@/types/paymentAdmin').PaymentDashboard>('/modules/features/payment/admin/dashboard', {}, token),
  getPaymentProviders: (token: string) =>
    request<import('@/types/paymentAdmin').PaymentProviderAdmin[]>('/modules/features/payment/admin/providers', {}, token),
  setPaymentProviderEnabled: (token: string, providerId: string, enabled: boolean) =>
    request<{ ok: boolean }>(
      `/modules/features/payment/admin/providers/${providerId}/enabled`,
      { method: 'PUT', body: JSON.stringify({ enabled }) },
      token
    ),
  getPaymentMethodTypes: (token: string) =>
    request<import('@/types/paymentAdmin').PaymentMethodTypeAdmin[]>(
      '/modules/features/payment/admin/method-types',
      {},
      token
    ),
  savePaymentMethodTypes: (token: string, methodTypes: Record<string, unknown>) =>
    request<import('@/types/paymentAdmin').PaymentMethodTypeAdmin[]>(
      '/modules/features/payment/admin/method-types',
      { method: 'PUT', body: JSON.stringify({ methodTypes }) },
      token
    ),
  getPaymentList: (token: string, params?: { page?: number; provider?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.provider) qs.set('provider', params.provider);
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return request<{ items: import('@/types/paymentAdmin').PaymentListItem[]; total: number; page: number; limit: number }>(
      `/modules/features/payment/admin/payments${q ? `?${q}` : ''}`,
      {},
      token
    );
  },
  getPaymentDetail: (token: string, paymentId: string) =>
    request<Record<string, unknown>>(`/modules/features/payment/admin/payments/${paymentId}`, {}, token),
  getPaymentLogs: (token: string, page = 1) =>
    request<{ items: import('@/types/paymentAdmin').PaymentAuditLog[]; total: number }>(
      `/modules/features/payment/admin/logs?page=${page}`,
      {},
      token
    ),
  getPaymentWebhooks: (token: string, page = 1) =>
    request<{ items: Record<string, unknown>[]; total: number }>(
      `/modules/features/payment/admin/webhooks?page=${page}`,
      {},
      token
    ),
  getPaymentHealth: (token: string) =>
    request<import('@/types/paymentAdmin').PaymentProviderAdmin[]>('/modules/features/payment/admin/health', {}, token),
  getPaymentStatistics: (token: string, period: 'today' | 'week' | 'month' = 'today') =>
    request<import('@/types/paymentAdmin').PaymentStatistics>(
      `/modules/features/payment/admin/statistics?period=${period}`,
      {},
      token
    ),
  getPaymentRefunds: (token: string, page = 1) =>
    request<{ items: import('@/types/paymentAdmin').PaymentAuditLog[]; total: number }>(
      `/modules/features/payment/admin/refunds?page=${page}`,
      {},
      token
    ),
  createPaymentRefund: (
    token: string,
    data: { providerId: string; transactionId: string; amountCents?: number; reason?: string; comment?: string; paymentId?: string }
  ) =>
    request<{ success: boolean; refundId?: string; error?: string }>(
      '/modules/features/payment/admin/refunds',
      { method: 'POST', body: JSON.stringify(data) },
      token
    ),
  downloadPaymentExport: async (token: string, path: string, filename: string) => {
    const url = buildApiUrl(`/modules/features/payment/admin/${path}`);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new ApiError(res.status, 'Export fehlgeschlagen');
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },
  testNotificationChannel: (token: string, channelId: string) =>
    request<{ ok: boolean; message?: string }>(
      `/modules/features/notifications/admin/channels/${channelId}/test`,
      { method: 'POST' },
      token
    ),
  testNotificationSmtp: (token: string) =>
    request<{ ok: boolean; message?: string }>(
      '/modules/features/notifications/admin/smtp/test',
      { method: 'POST' },
      token
    ),
  getLegalPages: (token: string) =>
    request<import('@/types/legal').AdminLegalPage[]>('/modules/features/legal/admin/pages', {}, token),
  updateLegalPage: (token: string, pageType: import('@/types/legal').LegalPageType, data: Partial<import('@/types/legal').AdminLegalPage>) =>
    request<import('@/types/legal').AdminLegalPage>(
      `/modules/features/legal/admin/pages/${pageType}`,
      { method: 'PUT', body: JSON.stringify(data) },
      token
    ),
  previewLegalPage: (token: string, pageType: import('@/types/legal').LegalPageType, contentHtml: string) =>
    request<{ html: string }>(
      '/modules/features/legal/admin/preview',
      { method: 'POST', body: JSON.stringify({ pageType, contentHtml }) },
      token
    ),
  testPrinter: (token: string, slotId: string) =>
    request<{ ok: boolean; message?: string }>(
      `/modules/features/printer/admin/printers/${slotId}/test`,
      { method: 'POST' },
      token
    ),
  discoverPrinters: (token: string) =>
    request<{ discovered: { host: string; port: number; type: string; reachable: boolean }[] }>(
      '/modules/features/printer/admin/discover',
      {},
      token
    ),
  getPermissions: (token: string) =>
    request<{
      available: { key: string; description: string }[];
      staff: string[];
      templates: import('@/types').RoleTemplate[];
    }>(
      '/admin/permissions',
      {},
      token
    ),
  updateUserPermissions: (token: string, userId: string, data: {
    permissions: string[];
    roleTemplate?: string | null;
    roleTemplates?: import('@/types').RoleTemplateId[];
  }) =>
    request<{ permissions: string[] }>(
      `/admin/users/${userId}/permissions`,
      { method: 'PUT', body: JSON.stringify(data) },
      token
    ),
  updateStaffPermissions: (token: string, permissions: string[]) =>
    request<{ permissions: string[] }>(
      '/admin/permissions/staff',
      { method: 'PUT', body: JSON.stringify({ permissions }) },
      token
    ),
};

import type { Event, CreateEventInput, FoodItem, Order, User, UserRole, DashboardStats, PickupBoardOrder, OrderStatus } from '@/types';
import type { OrderPaymentInfo } from '@/types/payment';

export type SyncResult<T> = {
  changed: boolean;
  etag: string;
  serverTime: string;
  data?: T;
};

export { ApiError };

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price);
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function getImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  const base = API_URL || '';
  let assetPath = url;
  if (assetPath.startsWith('/uploads/') && apiBasePath !== '/api') {
    const tenantPrefix = apiBasePath.replace(/\/api$/, '');
    assetPath = `${tenantPrefix}${assetPath}`;
  }
  return `${base}${assetPath}`;
}
