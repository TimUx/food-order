import type { PaymentProvider } from './PaymentProvider';
import type { FeatureContext } from '../../src/module-system/types';
import type { PaymentConfig } from './config';

class PaymentRegistryImpl {
  private providers = new Map<string, PaymentProvider>();

  register(provider: PaymentProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): PaymentProvider | undefined {
    return this.providers.get(id);
  }

  getAll(): PaymentProvider[] {
    return Array.from(this.providers.values());
  }

  async getConfigured(context: FeatureContext): Promise<PaymentProvider[]> {
    const config = await context.getConfig<PaymentConfig>('payment');
    return this.getAll().filter((p) => p.isConfigured(config));
  }

  async hasConfigured(context: FeatureContext): Promise<boolean> {
    const configured = await this.getConfigured(context);
    return configured.length > 0;
  }
}

export const paymentRegistry = new PaymentRegistryImpl();
