import type {
  PayableResource,
  PaymentCheckoutResult,
  PaymentService,
} from '../../../src/module-system/extension-points';
import type { FeatureContext } from '../../../src/module-system/types';
import { paymentManager } from '../PaymentManager';
import { paymentRepository } from '../repositories/paymentRepository';
import { moduleRegistry } from '../../../src/module-system/ModuleRegistry';

export function createPaymentService(context: FeatureContext): PaymentService {
  return {
    async isAvailable(): Promise<boolean> {
      if (!(await moduleRegistry.isActivated('payment'))) return false;
      if (!(await moduleRegistry.isInstalled('payment'))) return false;
      const config = await context.getConfig<{ onlinePaymentForEvents?: boolean }>('payment');
      if (config.onlinePaymentForEvents === false) return false;
      return paymentManager.hasActiveProvider(context);
    },

    async createCheckout(resource: PayableResource, providerId?: string): Promise<PaymentCheckoutResult> {
      const session = await paymentManager.createCheckout(context, resource, providerId);
      return {
        checkoutUrl: session.checkoutUrl!,
        sessionId: session.id,
        providerId: session.providerId,
      };
    },

    async isResourceReleased(type: string, id: string): Promise<boolean> {
      const session = await paymentRepository.findByResource(type, id);
      if (!session) return true;
      return session.released_to_kitchen || session.status === 'completed';
    },

    async filterReleasedIds(type: string, ids: string[]): Promise<string[]> {
      return paymentRepository.getReleasedResourceIds(type, ids);
    },
  };
}
