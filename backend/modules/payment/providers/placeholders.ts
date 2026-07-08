import type { FeatureContext } from '../../../src/module-system/types';
import type { PayableResource } from '../../../src/module-system/extension-points';
import type { PaymentProvider, PaymentSession, PaymentResult, RefundResult } from '../PaymentProvider';
import type { PaymentConfig } from '../config';

abstract class PlaceholderProvider implements PaymentProvider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly configKey: keyof PaymentConfig;

  isConfigured(config: Record<string, unknown>): boolean {
    const c = config as PaymentConfig;
    const section = c[this.configKey] as { enabled?: boolean } | undefined;
    return Boolean(section?.enabled);
  }

  async createCheckoutSession(
    _context: FeatureContext,
    _resource: PayableResource
  ): Promise<PaymentSession> {
    throw new Error(`${this.name} ist noch nicht implementiert`);
  }

  async handleWebhook(): Promise<PaymentResult> {
    return { success: false, sessionId: '', error: 'Webhook nicht implementiert' };
  }

  async refund(): Promise<RefundResult> {
    return { success: false, error: 'Rückerstattung nicht implementiert' };
  }

  async healthCheck(_context: FeatureContext): Promise<{ ok: boolean; message?: string }> {
    return { ok: false, message: `${this.name} – Platzhalter, noch nicht verfügbar` };
  }
}

export class PaypalProvider extends PlaceholderProvider {
  readonly id = 'paypal';
  readonly name = 'PayPal';
  readonly configKey = 'paypal';
}

export class VRPaymentProvider extends PlaceholderProvider {
  readonly id = 'vr-payment';
  readonly name = 'VR Payment';
  readonly configKey = 'vrPayment';
}

export class SPaymentProvider extends PlaceholderProvider {
  readonly id = 's-payment';
  readonly name = 'S-Payment';
  readonly configKey = 'sPayment';
}

export class PayoneProvider extends PlaceholderProvider {
  readonly id = 'payone';
  readonly name = 'PAYONE';
  readonly configKey = 'payone';
}

export class SumupProvider extends PlaceholderProvider {
  readonly id = 'sumup';
  readonly name = 'SumUp';
  readonly configKey = 'sumup';
}
