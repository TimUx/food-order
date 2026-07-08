import type { FeatureContext } from '../../src/module-system/types';
import type { PayableResource } from '../../src/module-system/extension-points';
import type { PaymentProvider, PaymentSession } from './PaymentProvider';
import { PaymentFactory } from './PaymentFactory';
import { paymentRegistry } from './PaymentRegistry';
import type { PaymentConfig } from './config';
import { moduleRegistry } from '../../src/module-system/ModuleRegistry';

class PaymentManagerImpl {
  async initialize(): Promise<void> {
    PaymentFactory.registerAll();
  }

  async isModuleActivated(): Promise<boolean> {
    return moduleRegistry.isActivated('payment');
  }

  async getConfig(context: FeatureContext): Promise<PaymentConfig> {
    return context.getConfig<PaymentConfig>('payment');
  }

  async hasActiveProvider(context: FeatureContext): Promise<boolean> {
    if (!(await this.isModuleActivated())) return false;
    PaymentFactory.registerAll();
    const configured = await paymentRegistry.getConfigured(context);
    return configured.length > 0;
  }

  async getAvailableProviders(context: FeatureContext): Promise<{ id: string; name: string; enabled: boolean }[]> {
    PaymentFactory.registerAll();
    const config = await this.getConfig(context);
    return paymentRegistry.getAll().map((p) => ({
      id: p.id,
      name: p.name,
      enabled: p.isConfigured(config),
    }));
  }

  async getConfiguredProviders(context: FeatureContext): Promise<PaymentProvider[]> {
    PaymentFactory.registerAll();
    return paymentRegistry.getConfigured(context);
  }

  async createCheckout(
    context: FeatureContext,
    resource: import('../../src/module-system/extension-points').PayableResource,
    providerId?: string
  ) {
    PaymentFactory.registerAll();
    const config = await this.getConfig(context);
    const providers = await paymentRegistry.getConfigured(context);
    if (providers.length === 0) throw new Error('Kein Zahlungsanbieter konfiguriert');

    const selected = providerId
      ? providers.find((p) => p.id === providerId)
      : providers.find((p) => p.id === config.defaultProvider) ?? providers[0];

    if (!selected) throw new Error(`Zahlungsanbieter nicht verfügbar: ${providerId}`);

    return selected.createCheckoutSession(context, resource);
  }

  async runHealthChecks(context: FeatureContext): Promise<Record<string, { ok: boolean; message?: string }>> {
    PaymentFactory.registerAll();
    const results: Record<string, { ok: boolean; message?: string }> = {};
    for (const provider of paymentRegistry.getAll()) {
      results[provider.id] = await provider.healthCheck(context);
    }
    return results;
  }

  async handleWebhook(
    context: FeatureContext,
    providerId: string,
    payload: Buffer,
    headers: Record<string, string | string[] | undefined>
  ) {
    PaymentFactory.registerAll();
    const provider = paymentRegistry.get(providerId);
    if (!provider) throw new Error(`Unbekannter Provider: ${providerId}`);
    return provider.handleWebhook(context, payload, headers);
  }
}

export const paymentManager = new PaymentManagerImpl();
