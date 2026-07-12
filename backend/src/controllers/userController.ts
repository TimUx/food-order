import { Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { AuthRequest } from '../middleware/auth';

export const userController = {
  async list(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const users = await userService.list();
      res.json(users);
    } catch (err) {
      next(err);
    }
  },

  async create(
    req: AuthRequest & {
      body: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role: 'ADMIN' | 'STAFF';
        roleTemplate?: string;
        permissions?: string[];
      };
    },
    res: Response,
    next: NextFunction
  ) {
    try {
      const user = await userService.create(req.body);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  },

  async update(
    req: AuthRequest & {
      params: { id: string };
      body: {
        email?: string;
        password?: string;
        firstName?: string;
        lastName?: string;
        role?: 'ADMIN' | 'STAFF';
        active?: boolean;
      };
    },
    res: Response,
    next: NextFunction
  ) {
    try {
      const user = await userService.update(req.params.id, req.body, req.user!.userId);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  async updatePermissions(
    req: AuthRequest & {
      params: { id: string };
      body: { permissions: string[]; roleTemplate?: string | null };
    },
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await userService.updatePermissions(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
