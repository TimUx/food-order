import { Response, NextFunction } from 'express';
import { foodItemService } from '../services/foodItemService';

export const foodItemController = {
  async getPublic(req: { query: { eventId?: string } }, res: Response, next: NextFunction) {
    try {
      const eventId = req.query.eventId;
      if (!eventId) {
        res.status(400).json({ error: 'Veranstaltung erforderlich' });
        return;
      }
      const result = await foodItemService.getPublicItems(eventId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getCatalog(_req: unknown, res: Response, next: NextFunction) {
    try {
      const items = await foodItemService.getCatalog();
      res.json(items);
    } catch (err) {
      next(err);
    }
  },

  async createCatalog(
    req: { body: Parameters<typeof foodItemService.createCatalogItem>[0] },
    res: Response,
    next: NextFunction
  ) {
    try {
      const item = await foodItemService.createCatalogItem(req.body);
      res.status(201).json(item);
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

  async getEventAssignments(req: { params: { eventId: string } }, res: Response, next: NextFunction) {
    try {
      const items = await foodItemService.getEventAssignments(req.params.eventId);
      res.json(items);
    } catch (err) {
      next(err);
    }
  },

  async setEventAssignments(
    req: { params: { eventId: string }; body: { foodItemIds: string[] } },
    res: Response,
    next: NextFunction
  ) {
    try {
      const items = await foodItemService.setEventAssignments(req.params.eventId, req.body.foodItemIds);
      res.json(items);
    } catch (err) {
      next(err);
    }
  },

  async create(
    req: { params: { eventId: string }; body: Parameters<typeof foodItemService.createForEvent>[1] },
    res: Response,
    next: NextFunction
  ) {
    try {
      const item = await foodItemService.createForEvent(req.params.eventId, req.body);
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

  async setSoldOut(
    req: { params: { id: string }; body: { soldOut: boolean; eventId?: string } },
    res: Response,
    next: NextFunction
  ) {
    try {
      const item = await foodItemService.setSoldOut(req.params.id, req.body.soldOut, req.body.eventId);
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
