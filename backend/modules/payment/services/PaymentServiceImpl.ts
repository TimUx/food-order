import type {
  PayableResource,
  PaymentCheckoutResult,
  PaymentMethodInfo,
  PaymentService,
  PaymentStatusResult,
  RefundResult,
  WebhookVerificationResult,
} from '../../../src/platform/module-api';
import type { FeatureContext } from '../../../src/platform/module-api';
import { paymentManager } from '../PaymentManager';
import { paymentRepository } from '../repositories/paymentRepository';
import { PAYMENT_FEATURES } from '../PaymentProvider';

export function createPaymentService(context: FeatureContext): PaymentService {
  return {
    async isAvailable(): Promise<boolean> {
      try {
        const config = await context.getConfig<{ onlinePaymentForEvents?: boolean }>('payment');
        if (config.onlinePaymentForEvents === false) return false;
        return paymentManager.hasActiveProvider(context);
      } catch {
        return false;
      }
    },

    async getAvailablePaymentMethods(): Promise<PaymentMethodInfo[]> {
      if (!(await this.isAvailable())) return [];
      return paymentManager.getAvailablePaymentMethods(context);
    },

    async createCheckout(resource: PayableResource, providerId?: string): Promise<PaymentCheckoutResult | null> {
      const session = await paymentManager.createCheckout(context, resource, providerId);
      return {
        sessionId: session.id,
        checkoutUrl: session.checkoutUrl ?? '',
        expiresAt: session.expiresAt?.toISOString(),
        paymentReference: session.paymentReference,
        paymentStatus: session.status,
        amount: session.amount,
        currency: session.currency,
        resourceId: session.resourceId,
        metadata: session.metadata,
      };
    },

    async cancelCheckout(sessionId: string): Promise<PaymentCheckoutResult> {
      return paymentManager.cancelCheckout(context, sessionId);
    },

    async retryCheckout(sessionId: string): Promise<PaymentCheckoutResult | null> {
      return paymentManager.retryCheckout(context, sessionId);
    },

    async getPaymentStatus(sessionId: string): Promise<PaymentStatusResult | null> {
      return paymentManager.getPaymentStatus(context, sessionId);
    },

    async verifyWebhook(
      providerId: string,
      payload: Buffer,
      headers: Record<string, string | string[] | undefined>
    ): Promise<WebhookVerificationResult> {
      return paymentManager.verifyWebhook(context, providerId, payload, headers);
    },

    async refund(providerId: string, transactionId: string, amountCents?: number): Promise<RefundResult> {
      return paymentManager.refund(context, providerId, transactionId, amountCents);
    },

    supports(feature: string): boolean {
      return paymentManager.supports(feature);
    },

    async healthCheck(): Promise<Record<string, { ok: boolean; message?: string }>> {
      return paymentManager.runHealthChecks(context);
    },

    async isResourceReleased(type: string, id: string): Promise<boolean> {
      const session = await paymentRepository.findByResource(type, id);
      if (!session) return true;
      const status = paymentRepository.resolveStatus(session);
      const pending = ['CREATED', 'PAYMENT_PENDING', 'PAYMENT_PROCESSING'].includes(status);
      return !pending || session.released_to_kitchen;
    },

    async filterReleasedIds(type: string, ids: string[]): Promise<string[]> {
      return paymentRepository.getReleasedResourceIds(type, ids);
    },
  };
}

export { PAYMENT_FEATURES };
