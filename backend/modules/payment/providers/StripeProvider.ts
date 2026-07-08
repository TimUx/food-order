import Stripe from 'stripe';
import type { FeatureContext } from '../../../src/module-system/types';
import type { PayableResource } from '../../../src/module-system/extension-points';
import type { PaymentProvider, PaymentResult, PaymentSession, RefundResult } from '../PaymentProvider';
import type { PaymentConfig } from '../config';
import { decryptSecret } from '../services/EncryptionService';
import { paymentRepository } from '../repositories/paymentRepository';
import { payableResourceRegistry } from '../../../src/module-system/extension-points';
import { logger } from '../../../src/utils/logger';

export class StripeProvider implements PaymentProvider {
  readonly id = 'stripe';
  readonly name = 'Stripe';

  private getStripeConfig(config: PaymentConfig) {
    return config.stripe;
  }

  isConfigured(config: Record<string, unknown>): boolean {
    const c = config as PaymentConfig;
    const s = this.getStripeConfig(c);
    return Boolean(s?.enabled && s.secretKey && s.publishableKey);
  }

  private getClient(config: PaymentConfig): Stripe {
    const s = this.getStripeConfig(config)!;
    const secretKey = decryptSecret(s.secretKey!);
    return new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  async createCheckoutSession(
    context: FeatureContext,
    params: PayableResource
  ): Promise<PaymentSession> {
    const config = await context.getConfig<PaymentConfig>('payment');
    const stripe = this.getClient(config);
    const s = this.getStripeConfig(config)!;

    const sessionId = await paymentRepository.createSession({
      resourceType: params.type,
      resourceId: params.id,
      providerId: this.id,
      amountCents: params.amountCents,
      currency: params.currency,
      metadata: params.metadata,
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: params.currency.toLowerCase(),
          unit_amount: params.amountCents,
          product_data: { name: params.description },
        },
        quantity: 1,
      }],
      customer_email: params.customerEmail,
      success_url: params.returnUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        payableResourceType: params.type,
        payableResourceId: params.id,
        internalSessionId: sessionId,
        ...params.metadata,
      },
    });

    await paymentRepository.updateSession(sessionId, {
      externalSessionId: session.id,
    });

    return {
      id: sessionId,
      resourceType: params.type,
      resourceId: params.id,
      providerId: this.id,
      amount: params.amountCents / 100,
      currency: params.currency,
      status: 'pending',
      checkoutUrl: session.url ?? undefined,
    };
  }

  async handleWebhook(
    context: FeatureContext,
    payload: Buffer,
    headers: Record<string, string | string[] | undefined>
  ): Promise<PaymentResult> {
    const config = await context.getConfig<PaymentConfig>('payment');
    const s = this.getStripeConfig(config)!;
    const stripe = this.getClient(config);
    const sig = headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') {
      return { success: false, sessionId: '', error: 'Fehlende Signatur' };
    }

    const webhookSecret = decryptSecret(s.webhookSecret || '');
    if (!webhookSecret) {
      return { success: false, sessionId: '', error: 'Webhook nicht konfiguriert' };
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } catch (err) {
      logger.warn('Stripe Webhook Signatur ungültig');
      return { success: false, sessionId: '', error: 'Ungültige Signatur' };
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const dbSession = await paymentRepository.findByExternalSessionId(session.id);
      if (!dbSession) {
        return { success: false, sessionId: '', error: 'Session nicht gefunden' };
      }

      await paymentRepository.updateSession(dbSession.id, {
        status: 'completed',
        releasedToKitchen: true,
        paidAt: new Date(),
      });

      await paymentRepository.createTransaction({
        sessionId: dbSession.id,
        externalTransactionId: session.payment_intent as string,
        type: 'payment',
        status: 'completed',
        amountCents: dbSession.amount_cents,
      });

      const adapter = payableResourceRegistry.getAdapter(dbSession.resource_type);
      if (adapter) {
        await adapter.onPaymentCompleted(dbSession.resource_id);
      }

      return {
        success: true,
        sessionId: dbSession.id,
        transactionId: session.payment_intent as string,
      };
    }

    return { success: true, sessionId: '' };
  }

  async refund(
    context: FeatureContext,
    transactionId: string,
    amountCents?: number
  ): Promise<RefundResult> {
    const config = await context.getConfig<PaymentConfig>('payment');
    const stripe = this.getClient(config);

    try {
      const refund = await stripe.refunds.create({
        payment_intent: transactionId,
        ...(amountCents ? { amount: amountCents } : {}),
      });
      return { success: true, refundId: refund.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Rückerstattung fehlgeschlagen' };
    }
  }

  async healthCheck(context: FeatureContext): Promise<{ ok: boolean; message?: string }> {
    const config = await context.getConfig<PaymentConfig>('payment');
    if (!this.isConfigured(config)) {
      return { ok: false, message: 'Stripe nicht konfiguriert' };
    }
    try {
      const stripe = this.getClient(config);
      await stripe.balance.retrieve();
      const mode = config.stripe?.sandbox ? 'Sandbox/Test' : 'Live';
      return { ok: true, message: `Stripe verbunden (${mode})` };
    } catch {
      return { ok: false, message: 'Stripe-Verbindung fehlgeschlagen' };
    }
  }
}
