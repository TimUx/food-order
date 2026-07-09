/** Payment lifecycle statuses (spec 6.1). */
export type PaymentStatus =
  | 'CREATED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_PAID'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_CANCELLED'
  | 'PAYMENT_TIMEOUT'
  | 'PAYMENT_REFUNDED'
  | 'ORDER_CONFIRMED'
  | 'IN_KITCHEN'
  | 'READY'
  | 'COLLECTED';

/** EventBus domain events emitted by the payment module. */
export const PAYMENT_EVENTS = {
  CREATED: 'PaymentCreated',
  STARTED: 'PaymentStarted',
  WAITING: 'PaymentWaiting',
  SUCCEEDED: 'PaymentSucceeded',
  FAILED: 'PaymentFailed',
  CANCELLED: 'PaymentCancelled',
  TIMEOUT: 'PaymentTimeout',
  REFUNDED: 'PaymentRefunded',
  ORDER_RELEASED: 'OrderReleased',
} as const;

export type PaymentEventName = (typeof PAYMENT_EVENTS)[keyof typeof PAYMENT_EVENTS];

export interface PaymentEventPayload {
  sessionId: string;
  resourceType: string;
  resourceId: string;
  amountCents: number;
  currency: string;
  paymentStatus: PaymentStatus;
  providerId?: string;
  transactionId?: string;
  reason?: string;
}

export interface PaymentMethodInfo {
  displayName: string;
  description: string;
  supportedPaymentMethods: string[];
  checkoutType: 'redirect' | 'embedded' | 'offline';
  icon?: string;
  sortOrder: number;
  recommended?: boolean;
  /** Internal – only for admin/provider selection within payment module. */
  providerId: string;
}

export interface CheckoutSessionDto {
  sessionId: string;
  checkoutUrl: string;
  expiresAt?: string;
  paymentReference?: string;
  paymentStatus: PaymentStatus;
  amount: number;
  currency: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentStatusDto {
  sessionId: string;
  paymentStatus: PaymentStatus;
  amount: number;
  currency: string;
  resourceType: string;
  resourceId: string;
  checkoutUrl?: string;
  expiresAt?: string;
  paidAt?: string;
  releasedToKitchen: boolean;
}

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
  replay?: boolean;
  eventId?: string;
  eventType?: string;
}

export type PaymentAuditAction =
  | 'checkout_created'
  | 'checkout_opened'
  | 'webhook_received'
  | 'webhook_validated'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'refund'
  | 'timeout'
  | 'provider_error'
  | 'connection_test'
  | 'checkout_cancelled'
  | 'checkout_retried';

/** Map legacy DB status column to PaymentStatus. */
export function legacyStatusToPaymentStatus(status: string): PaymentStatus {
  switch (status) {
    case 'pending':
      return 'PAYMENT_PENDING';
    case 'completed':
      return 'PAYMENT_PAID';
    case 'failed':
      return 'PAYMENT_FAILED';
    case 'cancelled':
      return 'PAYMENT_CANCELLED';
    case 'refunded':
      return 'PAYMENT_REFUNDED';
    default:
      return 'CREATED';
  }
}

export function resolvePaymentStatus(row: {
  payment_status?: string | null;
  status: string;
  released_to_kitchen: boolean;
}): PaymentStatus {
  if (row.payment_status === 'ORDER_CONFIRMED') return 'ORDER_CONFIRMED';
  if (row.payment_status) return row.payment_status as PaymentStatus;
  const base = legacyStatusToPaymentStatus(row.status);
  if (base === 'PAYMENT_PAID' && row.released_to_kitchen) return 'ORDER_CONFIRMED';
  return base;
}
