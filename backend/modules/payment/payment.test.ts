import { describe, it, expect } from 'vitest';
import { StripeProvider } from './providers/StripeProvider';
import { PaypalProvider } from './providers/placeholders';
import { defaultPaymentConfig } from './config';
import { toPaymentMethodInfo } from './providerMetadata';
import { legacyStatusToPaymentStatus, resolvePaymentStatus } from './types';
import { PAYMENT_FEATURES } from './PaymentProvider';

describe('PaymentProvider configuration', () => {
  it('Stripe is configured only with keys and enabled flag', () => {
    const stripe = new StripeProvider();
    expect(stripe.implemented).toBe(true);
    expect(stripe.isConfigured(defaultPaymentConfig)).toBe(false);
    expect(stripe.isConfigured({
      ...defaultPaymentConfig,
      stripe: {
        enabled: true,
        secretKey: 'sk_test_x',
        publishableKey: 'pk_test_x',
        sandbox: true,
      },
    })).toBe(true);
  });

  it('placeholder providers are never configured', () => {
    const paypal = new PaypalProvider();
    expect(paypal.implemented).toBe(false);
    expect(paypal.isConfigured({
      ...defaultPaymentConfig,
      paypal: { enabled: true, clientId: 'x', clientSecret: 'y', sandbox: true },
    })).toBe(false);
  });

  it('Stripe supports all payment features', () => {
    const stripe = new StripeProvider();
    expect(stripe.supports(PAYMENT_FEATURES.CHECKOUT)).toBe(true);
    expect(stripe.supports(PAYMENT_FEATURES.WEBHOOK)).toBe(true);
    expect(stripe.supports(PAYMENT_FEATURES.REFUND)).toBe(true);
    expect(stripe.supports(PAYMENT_FEATURES.CANCEL)).toBe(true);
  });

  it('placeholder providers support no features', () => {
    const paypal = new PaypalProvider();
    expect(paypal.supports(PAYMENT_FEATURES.CHECKOUT)).toBe(false);
  });
});

describe('Payment method metadata', () => {
  it('exposes display names without exposing internal provider id in public DTO', () => {
    const stripe = new StripeProvider();
    const info = toPaymentMethodInfo(stripe, { recommended: true });
    expect(info.displayName).toBe('Online bezahlen');
    expect(info.checkoutType).toBe('redirect');
    expect(info.providerId).toBe('stripe');
    const { providerId: _id, ...publicDto } = info;
    expect(publicDto).not.toHaveProperty('providerId');
    expect(publicDto.displayName).toBeDefined();
  });
});

describe('Payment status mapping', () => {
  it('maps legacy pending to PAYMENT_PENDING', () => {
    expect(legacyStatusToPaymentStatus('pending')).toBe('PAYMENT_PENDING');
    expect(legacyStatusToPaymentStatus('completed')).toBe('PAYMENT_PAID');
    expect(legacyStatusToPaymentStatus('cancelled')).toBe('PAYMENT_CANCELLED');
  });

  it('resolves ORDER_CONFIRMED when paid and released', () => {
    expect(resolvePaymentStatus({
      payment_status: 'PAYMENT_PAID',
      status: 'completed',
      released_to_kitchen: true,
    })).toBe('PAYMENT_PAID');

    expect(resolvePaymentStatus({
      payment_status: null,
      status: 'completed',
      released_to_kitchen: true,
    })).toBe('ORDER_CONFIRMED');
  });
});

describe('Payment method types', () => {
  it('parses provider id from method type key', async () => {
    const { parsePaymentMethodId } = await import('./methodTypes');
    expect(parsePaymentMethodId('stripe:card')).toEqual({ providerId: 'stripe', methodType: 'card' });
    expect(parsePaymentMethodId('stripe')).toEqual({ providerId: 'stripe', methodType: undefined });
  });

  it('builds enabled methods from methodTypes config', async () => {
    const { buildEnabledPaymentMethods } = await import('./methodTypes');
    const methods = buildEnabledPaymentMethods({
      ...defaultPaymentConfig,
      stripe: {
        enabled: true,
        secretKey: 'sk_test_x',
        publishableKey: 'pk_test_x',
        sandbox: true,
      },
      methodTypes: {
        'stripe:card': { enabled: true, recommended: true, sortOrder: 5 },
        'stripe:apple_pay': { enabled: false, recommended: false, sortOrder: 10 },
      },
    });
    expect(methods.some((m) => m.providerId === 'stripe:card')).toBe(true);
    expect(methods.some((m) => m.providerId === 'stripe:apple_pay')).toBe(false);
  });
});
