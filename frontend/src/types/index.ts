export type OrderStatus = 'NEW' | 'IN_PROGRESS' | 'READY' | 'PICKED_UP' | 'CANCELLED';
export type OrderSource = 'ONLINE' | 'CASHIER';
export type UserRole = 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  active?: boolean;
  createdAt?: string;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  onlineOrdersActive: boolean;
  cashierActive: boolean;
  ordersClosed: boolean;
  isActive: boolean;
}

export interface FoodItem {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  sortOrder: number;
  active: boolean;
  soldOut: boolean;
  maxQuantity?: number | null;
}

export interface OrderItem {
  id?: string;
  foodItemId: string;
  name?: string;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  displayNumber: string;
  orderDate: string;
  eventDateLabel?: string;
  source: OrderSource;
  sourceLabel: string;
  status: OrderStatus;
  statusLabel: string;
  totalPrice: number;
  createdAt: string;
  readyAt?: string;
  pickedUpAt?: string;
  cancelledAt?: string;
  canCancel?: boolean;
  cancellationDeadline?: string;
  cancellationDeadlineLabel?: string;
  customer?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  } | null;
  items: OrderItem[];
}

export interface DashboardStats {
  totalOrders: number;
  openOrders: number;
  readyOrders: number;
  pickedUpOrders: number;
  revenue: number;
  popularDishes: { name: string; count: number }[];
  avgProcessingMinutes: number;
}

export interface PickupBoardOrder {
  id: string;
  orderNumber: number;
  displayNumber: string;
  readyAt?: string;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Neu',
  IN_PROGRESS: 'In Bearbeitung',
  READY: 'Fertig',
  PICKED_UP: 'Abgeholt',
  CANCELLED: 'Storniert',
};

export const STATUS_COLORS: Record<OrderStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  NEW: 'info',
  IN_PROGRESS: 'warning',
  READY: 'success',
  PICKED_UP: 'default',
  CANCELLED: 'error',
};
