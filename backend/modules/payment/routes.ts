import { Router, Request, Response, NextFunction } from 'express';
import { paymentManager } from './PaymentManager';
import { AppError } from '../../src/middleware/errorHandler';
import type { FeatureContext } from '../../src/module-system/types';
import type { PaymentConfig } from './config';
import { encryptSecret, decryptSecret, maskSecret } from './services/EncryptionService';
import { authenticate, loadUser, requireRole } from '../../src/middleware/auth';
import { PAYMENT_PERMISSIONS } from './config';

export function createPaymentRoutes(context: FeatureContext): Router {
  const router = Router();

  router.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const available = await paymentManager.hasActiveProvider(context);
      res.json({ available });
    } catch (err) {
      next(err);
    }
  });

  router.get('/providers', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const providers = await paymentManager.getAvailableProviders(context);
      res.json(providers);
    } catch (err) {
      next(err);
    }
  });

  router.post('/webhooks/:providerId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
      const payload = rawBody ?? Buffer.from(JSON.stringify(req.body));
      const result = await paymentManager.handleWebhook(
        context,
        req.params.providerId as string,
        payload,
        req.headers as Record<string, string | string[] | undefined>
      );
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  });

  const adminRouter = Router();
  adminRouter.use(authenticate, loadUser, requireRole('ADMIN'));

  adminRouter.get('/config', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await context.getConfig<PaymentConfig>('payment');
      res.json(sanitizeConfigForAdmin(config));
    } catch (err) {
      next(err);
    }
  });

  adminRouter.put('/config', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const incoming = req.body as PaymentConfig;
      const current = await context.getConfig<PaymentConfig>('payment');
      const merged = mergeAndEncryptConfig(current, incoming);
      const { paymentConfigSchema } = await import('./config');
      paymentConfigSchema.parse(merged);
      await context.setConfig('payment', merged);
      res.json(sanitizeConfigForAdmin(merged));
    } catch (err) {
      next(err);
    }
  });

  adminRouter.post('/providers/:id/test', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const checks = await paymentManager.runHealthChecks(context);
      const result = checks[req.params.id as string];
      if (!result) throw new AppError(404, 'Provider nicht gefunden');
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  adminRouter.post('/refund', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { transactionId, amountCents, providerId } = req.body as {
        transactionId: string;
        amountCents?: number;
        providerId: string;
      };
      const { paymentRegistry } = await import('./PaymentRegistry');
      const { PaymentFactory } = await import('./PaymentFactory');
      PaymentFactory.registerAll();
      const provider = paymentRegistry.get(providerId);
      if (!provider) throw new AppError(404, 'Provider nicht gefunden');
      const result = await provider.refund(context, transactionId, amountCents);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.use('/admin', adminRouter);

  return router;
}

function mergeAndEncryptConfig(current: PaymentConfig, incoming: PaymentConfig): PaymentConfig {
  const providers = ['stripe', 'paypal', 'vrPayment', 'sPayment', 'payone', 'sumup'] as const;
  const merged = { ...current, ...incoming };

  for (const key of providers) {
    const section = incoming[key];
    if (!section) continue;
    const cur = (merged[key] ?? {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(section)) {
      if (k.includes('Key') || k.includes('Secret') || k === 'key') {
        if (typeof v === 'string' && v && !v.startsWith('••')) {
          cur[k] = encryptSecret(v);
        }
      } else {
        cur[k] = v;
      }
    }
    (merged as Record<string, unknown>)[key] = cur;
  }

  return merged;
}

function sanitizeConfigForAdmin(config: PaymentConfig): PaymentConfig {
  const copy = JSON.parse(JSON.stringify(config)) as PaymentConfig;
  const secretFields = ['secretKey', 'clientSecret', 'apiKey', 'key', 'webhookSecret'] as const;

  for (const provider of ['stripe', 'paypal', 'vrPayment', 'sPayment', 'payone', 'sumup'] as const) {
    const section = copy[provider];
    if (!section) continue;
    for (const field of secretFields) {
      const val = (section as Record<string, unknown>)[field];
      if (typeof val === 'string' && val) {
        (section as Record<string, unknown>)[field] = maskSecret(decryptSecret(val));
      }
    }
  }

  return copy;
}
