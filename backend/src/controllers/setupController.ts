import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { tenantSetupService } from '../services/tenantSetupService';

export const setupController = {
  async getStatus(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(await tenantSetupService.getStatus());
    } catch (err) {
      next(err);
    }
  },

  async saveStep(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { step, data } = req.body as { step: number; data: Record<string, unknown> };
      res.json(await tenantSetupService.saveStep(step, data));
    } catch (err) {
      next(err);
    }
  },

  async complete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data } = req.body as { data: Record<string, unknown> };
      res.json(await tenantSetupService.complete(data, req.user!.userId));
    } catch (err) {
      next(err);
    }
  },

  async reset(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(await tenantSetupService.reset());
    } catch (err) {
      next(err);
    }
  },
};
