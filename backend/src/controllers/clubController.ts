import { Response, NextFunction } from 'express';
import { clubService } from '../services/clubService';

export const clubController = {
  async getPublic(_req: unknown, res: Response, next: NextFunction) {
    try {
      const club = await clubService.getPublic();
      res.json(club);
    } catch (err) {
      next(err);
    }
  },

  async getOrderSettings(_req: unknown, res: Response, next: NextFunction) {
    try {
      const settings = await clubService.getOrderSettings();
      res.json(settings);
    } catch (err) {
      next(err);
    }
  },

  async getEmailSettings(_req: unknown, res: Response, next: NextFunction) {
    try {
      const settings = await clubService.getEmailSettings();
      res.json(settings);
    } catch (err) {
      next(err);
    }
  },

  async updateEmailSettings(
    req: { body: Parameters<typeof clubService.updateEmailSettings>[0] },
    res: Response,
    next: NextFunction
  ) {
    try {
      const settings = await clubService.updateEmailSettings(req.body);
      res.json(settings);
    } catch (err) {
      next(err);
    }
  },

  async get(_req: unknown, res: Response, next: NextFunction) {
    try {
      const club = await clubService.getPublic();
      res.json(club);
    } catch (err) {
      next(err);
    }
  },

  async update(req: { body: Parameters<typeof clubService.update>[0] }, res: Response, next: NextFunction) {
    try {
      const club = await clubService.update(req.body);
      res.json(club);
    } catch (err) {
      next(err);
    }
  },
};
