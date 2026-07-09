import { Router, Request, Response, NextFunction } from 'express';
import { notificationManager } from './NotificationManager';
import { notificationDeliveryRepository } from './repositories/notificationDeliveryRepository';
import type { FeatureContext } from '../../src/module-system/types';

export function createNotificationAdminRoutes(context: FeatureContext): Router {
  const router = Router();

  router.post('/channels/:channelId/test', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const channelId = req.params.channelId as string;
      const result = await notificationManager.testChannel(context, channelId);
      if (!result.ok) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/smtp/test', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await notificationManager.testChannel(context, 'email');
      if (!result.ok) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const active = await notificationManager.hasActiveChannel(context);
      const checks = await notificationManager.runHealthChecks(context);
      res.json({ active, channels: checks });
    } catch (err) {
      next(err);
    }
  });

  router.get('/deliveries', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const deliveries = await notificationDeliveryRepository.findRecent(limit);
      res.json({ deliveries });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
