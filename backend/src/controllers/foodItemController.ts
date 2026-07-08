import { Response, NextFunction } from 'express';
import { foodItemService } from '../services/foodItemService';

export const foodItemController = {
  async getPublic(_req: unknown, res: Response, next: NextFunction) {
    try {
      const result = await foodItemService.getPublicItems();
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getByEvent(req: { params: { eventId: string } }, res: Response, next: NextFunction) {
    try {
      const items = await foodItemService.getByEvent(req.params.eventId);
      res.json(items);
    } catch (err) {
      next(err);
    }
  },

  async create(
    req: { params: { eventId: string }; body: Parameters<typeof foodItemService.create>[1] },
    res: Response,
    next: NextFunction
  ) {
    try {
      const item = await foodItemService.create(req.params.eventId, req.body);
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  },

  async update(
    req: { params: { id: string }; body: Parameters<typeof foodItemService.update>[1] },
    res: Response,
    next: NextFunction
  ) {
    try {
      const item = await foodItemService.update(req.params.id, req.body);
      res.json(item);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: { params: { id: string } }, res: Response, next: NextFunction) {
    try {
      await foodItemService.delete(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
