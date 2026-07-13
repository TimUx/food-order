import { Response, NextFunction } from 'express';
import { StatusCode } from '@prisma/client';
import { orderService } from '../services/orderService';
import { orderExportService } from '../services/orderExportService';
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
      const { eventId, firstName, lastName, email, phone, items, paymentMethodId } = req.body;
      const order = await orderService.createOnlineOrder({
        eventId,
        firstName,
        lastName,
        email,
        phone,
        items,
        paymentMethodId,
      });
      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  },

  async createCashier(
    req: { body: { eventId: string; items: { foodItemId: string; quantity: number }[]; paymentMethodId?: string } },
    res: Response,
    next: NextFunction
  ) {
    try {
      const order = await orderService.createCashierOrder(req.body.eventId, req.body.items, req.body.paymentMethodId);
      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  },

  async getByEvent(
    req: { params: { eventId: string }; query: { status?: string; kitchenOnly?: string } },
    res: Response,
    next: NextFunction
  ) {
    try {
      let statusFilter: StatusCode[] | undefined;
      if (req.query.status) {
        statusFilter = req.query.status.split(',') as StatusCode[];
      }
      const kitchenOnly = req.query.kitchenOnly === '1' || req.query.kitchenOnly === 'true';
      const orders = await orderService.getByEvent(req.params.eventId, statusFilter, { kitchenOnly });
      res.json(orders);
    } catch (err) {
      next(err);
    }
  },

  async getByLookupToken(
    req: { params: { token: string }; query: { lastName?: string } },
    res: Response,
    next: NextFunction
  ) {
    try {
      const order = await orderService.getByLookupToken(req.params.token, req.query.lastName);
      res.json(order);
    } catch (err) {
      next(err);
    }
  },

  async lookup(req: { body: { eventId: string; orderNumber: number; lastName?: string } }, res: Response, next: NextFunction) {
    try {
      const order = await orderService.lookupByNumberAndName(
        req.body.eventId,
        req.body.orderNumber,
        req.body.lastName
      );
      res.json(order);
    } catch (err) {
      next(err);
    }
  },

  async lookupByNumber(req: { body: { eventId: string; orderNumber: number; lastName?: string } }, res: Response, next: NextFunction) {
    try {
      const order = await orderService.lookupByNumber(req.body.eventId, req.body.orderNumber, req.body.lastName);
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

  async updateItems(
    req: AuthRequest & { params: { id: string }; body: { items: { foodItemId: string; quantity: number }[] } },
    res: Response,
    next: NextFunction
  ) {
    try {
      const order = await orderService.updateItems(req.params.id, req.body.items, req.user?.userId);
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

  async getReady(req: { query: { eventId?: string } }, res: Response, next: NextFunction) {
    try {
      if (!req.query.eventId) {
        res.status(400).json({ error: 'Veranstaltung erforderlich' });
        return;
      }
      await eventService.getPickupEvent(req.query.eventId);
      const orders = await orderService.getReadyOrders(req.query.eventId);
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

  async exportEventOrdersJson(req: { params: { eventId: string } }, res: Response, next: NextFunction) {
    try {
      const data = await orderExportService.getEventExport(req.params.eventId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async exportEventOrdersXlsx(req: { params: { eventId: string } }, res: Response, next: NextFunction) {
    try {
      const { filename, content } = await orderExportService.getEventXlsx(req.params.eventId);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(content);
    } catch (err) {
      next(err);
    }
  },

  async cancelOnline(
    req: { params: { token: string }; body: { lastName: string } },
    res: Response,
    next: NextFunction
  ) {
    try {
      const order = await orderService.cancelOnlineOrder(req.params.token, req.body.lastName);
      res.json(order);
    } catch (err) {
      next(err);
    }
  },

  async createCheckout(
    req: { params: { id: string }; body: { paymentMethodId: string } },
    res: Response,
    next: NextFunction
  ) {
    try {
      const payment = await orderService.createOrderCheckout(req.params.id, req.body.paymentMethodId);
      res.json(payment);
    } catch (err) {
      next(err);
    }
  },

  async abortCashierPayment(
    req: AuthRequest & { params: { id: string }; body: { sessionId: string } },
    res: Response,
    next: NextFunction
  ) {
    try {
      const order = await orderService.abortCashierOrderPayment(req.params.id, req.body.sessionId);
      res.json(order);
    } catch (err) {
      next(err);
    }
  },
};
