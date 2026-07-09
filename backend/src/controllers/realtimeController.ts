import { Response, NextFunction } from 'express';
import { StatusCode } from '@prisma/client';
import { realtimeSyncService } from '../services/realtimeSyncService';
import { AuthRequest } from '../middleware/auth';

export const realtimeController = {
  async syncEventOrders(
    req: AuthRequest & { params: { eventId: string }; query: { status?: string; etag?: string } },
    res: Response,
    next: NextFunction
  ) {
    try {
      let statusFilter: StatusCode[] | undefined;
      if (req.query.status) {
        statusFilter = req.query.status.split(',').filter(Boolean) as StatusCode[];
        if (statusFilter.length === 0) statusFilter = undefined;
      }
      const result = await realtimeSyncService.syncEventOrders(
        req.params.eventId,
        statusFilter,
        req.query.etag
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async syncEventStats(
    req: AuthRequest & { params: { eventId: string }; query: { etag?: string } },
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await realtimeSyncService.syncEventStats(req.params.eventId, req.query.etag);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async syncPickupBoard(req: { query: { etag?: string } }, res: Response, next: NextFunction) {
    try {
      const result = await realtimeSyncService.syncPickupBoard(req.query.etag);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async syncOrder(
    req: { params: { token: string }; query: { lastName?: string; etag?: string } },
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await realtimeSyncService.syncOrderByToken(
        req.params.token,
        req.query.lastName,
        req.query.etag
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async syncPayment(
    req: { params: { sessionId: string }; query: { etag?: string } },
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await realtimeSyncService.syncPaymentStatus(req.params.sessionId, req.query.etag);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async syncClub(req: { query: { etag?: string } }, res: Response, next: NextFunction) {
    try {
      const result = await realtimeSyncService.syncClub(req.query.etag);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
