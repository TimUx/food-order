import { Response, NextFunction } from 'express';
import { eventService } from '../services/eventService';

export const eventController = {
  async getActive(_req: unknown, res: Response, next: NextFunction) {
    try {
      const event = await eventService.getActive();
      res.json(event);
    } catch (err) {
      next(err);
    }
  },

  async getAll(_req: unknown, res: Response, next: NextFunction) {
    try {
      const events = await eventService.getAll();
      res.json(events);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: { params: { id: string } }, res: Response, next: NextFunction) {
    try {
      const event = await eventService.getById(req.params.id);
      res.json(event);
    } catch (err) {
      next(err);
    }
  },

  async create(req: { body: Parameters<typeof eventService.create>[0] }, res: Response, next: NextFunction) {
    try {
      const event = await eventService.create(req.body);
      res.status(201).json(event);
    } catch (err) {
      next(err);
    }
  },

  async update(
    req: { params: { id: string }; body: Parameters<typeof eventService.update>[1] },
    res: Response,
    next: NextFunction
  ) {
    try {
      const event = await eventService.update(req.params.id, req.body);
      res.json(event);
    } catch (err) {
      next(err);
    }
  },

  async setActive(req: { params: { id: string } }, res: Response, next: NextFunction) {
    try {
      const event = await eventService.setActive(req.params.id);
      res.json(event);
    } catch (err) {
      next(err);
    }
  },
};
