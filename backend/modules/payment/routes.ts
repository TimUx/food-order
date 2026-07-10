import { Router, Request, Response, NextFunction } from 'express';
import { paymentManager } from './PaymentManager';
import { AppError } from '../../src/middleware/errorHandler';
import { webhookRateLimiter } from '../../src/middleware/rateLimit';
import type { FeatureContext } from '../../src/module-system/types';
import { createPaymentService } from './services/PaymentServiceImpl';

export function createPaymentPublicRoutes(context: FeatureContext): Router {
  const router = Router();
  const service = createPaymentService(context);

  router.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const available = await paymentManager.hasActiveProvider(context);
      res.json({ available });
    } catch (err) {
      next(err);
    }
  });

  /** Öffentliche Zahlungsarten – ohne technische Providernamen. */
  router.get('/methods', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await context.getConfig<{ allowCashOnSite?: boolean }>('payment');
      const methods = await service.getAvailablePaymentMethods();
      res.json({
        allowCashOnSite: config.allowCashOnSite !== false,
        methods: methods.map(({ providerId, supportedPaymentMethods, ...publicMethod }) => ({
          ...publicMethod,
          methodId: providerId,
          supportedMethods: supportedPaymentMethods,
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/checkout/:sessionId/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await service.getPaymentStatus(req.params.sessionId as string);
      if (!status) throw new AppError(404, 'Zahlungssession nicht gefunden');
      res.json(status);
    } catch (err) {
      next(err);
    }
  });

  router.post('/checkout/:sessionId/cancel', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await service.cancelCheckout(req.params.sessionId as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/checkout/:sessionId/retry', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await service.retryCheckout(req.params.sessionId as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/webhooks/:providerId', webhookRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
      if (!rawBody) {
        res.status(400).json({ error: 'Webhook erfordert unveränderten Request-Body' });
        return;
      }
      const result = await paymentManager.handleWebhook(
        context,
        req.params.providerId as string,
        rawBody,
        req.headers as Record<string, string | string[] | undefined>
      );
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({ received: true, replay: result.replay ?? false });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
