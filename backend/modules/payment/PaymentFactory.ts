import type { PaymentProvider } from './PaymentProvider';
import { StripeProvider } from './providers/StripeProvider';
import {
  PaypalProvider,
  VRPaymentProvider,
  SPaymentProvider,
  PayoneProvider,
  SumupProvider,
} from './providers/placeholders';
import { paymentRegistry } from './PaymentRegistry';

export class PaymentFactory {
  private static registered = false;

  static registerAll(): void {
    if (this.registered) return;

    const providers: PaymentProvider[] = [
      new StripeProvider(),
      new PaypalProvider(),
      new VRPaymentProvider(),
      new SPaymentProvider(),
      new PayoneProvider(),
      new SumupProvider(),
    ];

    for (const provider of providers) {
      paymentRegistry.register(provider);
    }

    this.registered = true;
  }
}
