const API_URL = import.meta.env.VITE_API_URL || '';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = path.startsWith('http') ? path : `${API_URL}/api${path}`;
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unbekannter Fehler' }));
    throw new ApiError(res.status, body.error || 'Anfrage fehlgeschlagen');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Public
  getPublicEvent: () => request<{ id: string; name: string; onlineOrdersActive: boolean; ordersClosed: boolean }>('/public/event'),
  getPublicMenu: () => request<{ event: Event; items: FoodItem[] }>('/public/menu'),
  createOrder: (data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    items: { foodItemId: string; quantity: number }[];
    formStartedAt: number;
    _hp?: string;
    turnstileToken?: string;
  }) => request<Order>('/public/orders', { method: 'POST', body: JSON.stringify(data) }),
  lookupOrder: (orderNumber: number, lastName: string) =>
    request<Order>('/public/orders/lookup', { method: 'POST', body: JSON.stringify({ orderNumber, lastName }) }),
  getOrder: (id: string) => request<Order>(`/public/orders/${id}`),
  cancelOrder: (id: string, lastName: string) =>
    request<Order>(`/public/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ lastName }) }),
  getPickupBoard: () => request<PickupBoardOrder[]>('/public/pickup-board'),
  getClub: () => request<import('@/types/club').ClubSettings>('/public/club'),
  getOrderSettings: () => request<import('@/types/club').OrderSettings>('/public/order-settings'),

  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: (token: string) => request<User>('/auth/me', {}, token),

  // Staff
  getEvents: (token: string) => request<Event[]>('/staff/events', {}, token),
  getActiveEvent: (token: string) => request<Event>('/staff/events/active', {}, token),
  createEvent: (token: string, data: Partial<Event>) =>
    request<Event>('/staff/events', { method: 'POST', body: JSON.stringify(data) }, token),
  updateEvent: (token: string, id: string, data: Partial<Event>) =>
    request<Event>(`/staff/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  activateEvent: (token: string, id: string) =>
    request<Event>(`/staff/events/${id}/activate`, { method: 'POST' }, token),

  getFoodItems: (token: string, eventId: string) =>
    request<FoodItem[]>(`/staff/events/${eventId}/food-items`, {}, token),
  createFoodItem: (token: string, eventId: string, data: Partial<FoodItem>) =>
    request<FoodItem>(`/staff/events/${eventId}/food-items`, { method: 'POST', body: JSON.stringify(data) }, token),
  updateFoodItem: (token: string, id: string, data: Partial<FoodItem>) =>
    request<FoodItem>(`/staff/food-items/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
  deleteFoodItem: (token: string, id: string) =>
    request<void>(`/staff/food-items/${id}`, { method: 'DELETE' }, token),
  uploadFoodImage: async (token: string, id: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const url = `${API_URL}/api/staff/food-items/${id}/image`;
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

  getOrders: (token: string, eventId: string, status?: string) => {
    const query = status ? `?status=${status}` : '';
    return request<Order[]>(`/staff/events/${eventId}/orders${query}`, {}, token);
  },
  getStats: (token: string, eventId: string) =>
    request<DashboardStats>(`/staff/events/${eventId}/stats`, {}, token),
  createCashierOrder: (token: string, items: { foodItemId: string; quantity: number }[]) =>
    request<Order>('/staff/orders/cashier', { method: 'POST', body: JSON.stringify({ items }) }, token),
  lookupOrderByNumber: (token: string, orderNumber: number) =>
    request<Order>('/staff/orders/lookup', { method: 'POST', body: JSON.stringify({ orderNumber }) }, token),
  updateOrderStatus: (token: string, id: string, status: OrderStatus) =>
    request<Order>(`/staff/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
  advanceOrder: (token: string, id: string) =>
    request<Order>(`/staff/orders/${id}/advance`, { method: 'POST' }, token),

  getClubSettings: (token: string) =>
    request<import('@/types/club').ClubSettings>('/admin/club', {}, token),
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
    const url = `${API_URL}/api/admin/club/logo`;
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

  getUsers: (token: string) => request<User[]>('/admin/users', {}, token),
  createUser: (token: string, data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  }) => request<User>('/admin/users', { method: 'POST', body: JSON.stringify(data) }, token),
  updateUser: (token: string, id: string, data: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    active?: boolean;
  }) => request<User>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token),
};

import type { Event, FoodItem, Order, User, UserRole, DashboardStats, PickupBoardOrder, OrderStatus } from '@/types';

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
  return `${base}${url}`;
}
