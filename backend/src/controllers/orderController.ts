import { Response, NextFunction } from 'express';
import { StatusCode } from '@prisma/client';
import { orderService } from '../services/orderService';
import { eventService } from '../services/eventService';
import { AuthRequest } from '../middleware/auth';
import { validateOrderBotProtection, BotProtectionPayload } from '../middleware/botProtection';

export const orderController = {
  async createOnline(
    req: { body: Parameters<typeof orderService.createOnlineOrder>[0] & BotProtectionPayload },
    res: Response,
    next: NextFunction
  ) {
    try {
      await validateOrderBotProtection(req.body);
      const { firstName, lastName, email, phone, items } = req.body;
      const order = await orderService.createOnlineOrder({ firstName, lastName, email, phone, items });
      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  },

  async createCashier(req: { body: { items: { foodItemId: string; quantity: number }[] } }, res: Response, next: NextFunction) {
    try {
      const order = await orderService.createCashierOrder(req.body.items);
      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  },

  async getByEvent(req: { params: { eventId: string }; query: { status?: string } }, res: Response, next: NextFunction) {
    try {
      let statusFilter: StatusCode[] | undefined;
      if (req.query.status) {
        statusFilter = req.query.status.split(',') as StatusCode[];
      }
      const orders = await orderService.getByEvent(req.params.eventId, statusFilter);
      res.json(orders);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: { params: { id: string } }, res: Response, next: NextFunction) {
    try {
      const order = await orderService.getById(req.params.id);
      res.json(order);
    } catch (err) {
      next(err);
    }
  },

  async lookup(req: { body: { orderNumber: number; lastName: string } }, res: Response, next: NextFunction) {
    try {
      const order = await orderService.lookupByNumberAndName(req.body.orderNumber, req.body.lastName);
      res.json(order);
    } catch (err) {
      next(err);
    }
  },

  async lookupByNumber(req: { body: { orderNumber: number } }, res: Response, next: NextFunction) {
    try {
      const order = await orderService.lookupByNumber(req.body.orderNumber);
      res.json(order);
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(
    req: AuthRequest & { params: { id: string }; body: { status: StatusCode } },
    res: Response,
    next: NextFunction
  ) {
    try {
      const order = await orderService.updateStatus(req.params.id, req.body.status, req.user?.userId);
      res.json(order);
    } catch (err) {
      next(err);
    }
  },

  async advanceStatus(req: AuthRequest & { params: { id: string } }, res: Response, next: NextFunction) {
    try {
      const order = await orderService.advanceStatus(req.params.id, req.user?.userId);
      res.json(order);
    } catch (err) {
      next(err);
    }
  },

  async getReady(_req: unknown, res: Response, next: NextFunction) {
    try {
      const event = await eventService.getActive();
      const orders = await orderService.getReadyOrders(event.id);
      res.json(orders);
    } catch (err) {
      next(err);
    }
  },

  async getStats(req: { params: { eventId: string } }, res: Response, next: NextFunction) {
    try {
      const stats = await orderService.getStats(req.params.eventId);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  },
};
