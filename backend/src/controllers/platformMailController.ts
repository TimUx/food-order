import type { Response, NextFunction } from 'express';
import type { PlatformAuthRequest } from '../middleware/platformAuth';
import { mailService } from '../platform/mail/MailService';
import { authConfigService } from '../services/authConfigService';

export const platformMailController = {
  async getConfig(_req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const smtp = await mailService.getConfigForAdmin();
      const auth = await authConfigService.getConfig();
      res.json({ smtp, auth });
    } catch (err) {
      next(err);
    }
  },

  async updateSmtp(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const smtp = await mailService.updateConfig(req.body, req.platformUser?.userId);
      res.json(smtp);
    } catch (err) {
      next(err);
    }
  },

  async updateAuth(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const auth = await authConfigService.updateConfig(req.body, req.platformUser?.userId);
      res.json(auth);
    } catch (err) {
      next(err);
    }
  },

  async testConnection(_req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(await mailService.testConnection());
    } catch (err) {
      next(err);
    }
  },

  async sendTestMail(req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      const { recipient } = req.body as { recipient: string };
      const result = await mailService.sendTestMail(recipient, req.platformUser?.userId);
      if (!result.ok) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },

  async getQueueStatus(_req: PlatformAuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(await mailService.getQueueStatus());
    } catch (err) {
      next(err);
    }
  },
};
