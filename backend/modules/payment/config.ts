import { z } from 'zod';

export const PAYMENT_PERMISSIONS = {
  VIEW: 'payment.view',
  MANAGE: 'payment.manage',
  REFUND: 'payment.refund',
  LOGS: 'payment.logs',
  STATISTICS: 'payment.statistics',
  PROVIDER_CONFIGURE: 'payment.provider.configure',
  WEBHOOKS: 'payment.webhooks',
  /** @deprecated use PROVIDER_CONFIGURE */
  SETTINGS: 'payment.settings',
} as const;

export const methodTypeConfigSchema = z.object({
  enabled: z.boolean().default(true),
  recommended: z.boolean().default(false),
  sortOrder: z.number().default(10),
  description: z.string().optional(),
  icon: z.string().optional(),
});

const providerEnabledSchema = z.object({
  enabled: z.boolean().default(false),
});

export const paymentConfigSchema = z.object({
  defaultProvider: z.string().optional(),
  onlinePaymentForEvents: z.boolean().default(true),
  allowCashOnSite: z.boolean().default(true),
  methodTypes: z.record(methodTypeConfigSchema).optional(),
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
  allowCashOnSite: true,
  stripe: { enabled: false, sandbox: true },
  paypal: { enabled: false, sandbox: true },
  vrPayment: { enabled: false },
  sPayment: { enabled: false },
  payone: { enabled: false },
  sumup: { enabled: false },
};
