import { z } from 'zod';

export const PAYMENT_PERMISSIONS = {
  REFUND: 'payment.refund',
  SETTINGS: 'payment.settings',
  VIEW: 'payment.view',
} as const;

const providerEnabledSchema = z.object({
  enabled: z.boolean().default(false),
});

export const paymentConfigSchema = z.object({
  defaultProvider: z.string().optional(),
  onlinePaymentForEvents: z.boolean().default(true),
  stripe: z.object({
    enabled: z.boolean().default(false),
    secretKey: z.string().optional(),
    publishableKey: z.string().optional(),
    webhookSecret: z.string().optional(),
    sandbox: z.boolean().default(true),
  }).optional(),
  paypal: providerEnabledSchema.extend({
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    sandbox: z.boolean().default(true),
  }).optional(),
  vrPayment: providerEnabledSchema.extend({
    merchantId: z.string().optional(),
    apiKey: z.string().optional(),
  }).optional(),
  sPayment: providerEnabledSchema.extend({
    merchantId: z.string().optional(),
    apiKey: z.string().optional(),
  }).optional(),
  payone: providerEnabledSchema.extend({
    merchantId: z.string().optional(),
    portalId: z.string().optional(),
    key: z.string().optional(),
  }).optional(),
  sumup: providerEnabledSchema.extend({
    apiKey: z.string().optional(),
    merchantCode: z.string().optional(),
  }).optional(),
});

export type PaymentConfig = z.infer<typeof paymentConfigSchema>;

export const defaultPaymentConfig: PaymentConfig = {
  onlinePaymentForEvents: true,
  stripe: { enabled: false, sandbox: true },
  paypal: { enabled: false, sandbox: true },
  vrPayment: { enabled: false },
  sPayment: { enabled: false },
  payone: { enabled: false },
  sumup: { enabled: false },
};
