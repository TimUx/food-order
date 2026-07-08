import type { FeatureContext } from '../../src/module-system/types';
import type { PayableResource } from '../../src/module-system/extension-points';

export interface PaymentSession {
  id: string;
  resourceType: string;
  resourceId: string;
  providerId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  checkoutUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentResult {
  success: boolean;
  sessionId: string;
  transactionId?: string;
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

export interface PaymentProvider {
  readonly id: string;
  readonly name: string;

  isConfigured(config: Record<string, unknown>): boolean;

  createCheckoutSession(
    context: FeatureContext,
    resource: PayableResource
  ): Promise<PaymentSession>;

  handleWebhook(
    context: FeatureContext,
    payload: Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<PaymentResult>;

  refund(
    context: FeatureContext,
    transactionId: string,
    amountCents?: number
  ): Promise<RefundResult>;

  healthCheck(context: FeatureContext): Promise<{ ok: boolean; message?: string }>;
}
