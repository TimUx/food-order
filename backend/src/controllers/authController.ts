import { Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { AuthRequest } from '../middleware/auth';
import { authConfigService } from '../services/authConfigService';

export const authController = {
  async getAuthConfig(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json(await authConfigService.getPublicConfig());
    } catch (err) {
      next(err);
    }
  },

  async login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const userAgent = req.headers['user-agent'];
      const result = await authService.login(email, password, userAgent);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async requestMagicLink(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, loginPath } = req.body as { email: string; loginPath?: string };
      const path = loginPath ?? '/admin/login';
      const result = await authService.requestMagicLink(
        email,
        path,
        req.headers['user-agent'],
        req.ip
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async requestLoginCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email } = req.body as { email: string };
      const result = await authService.requestLoginCode(
        email,
        req.headers['user-agent'],
        req.ip
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async verifyMagicLink(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { token } = req.body as { token: string };
      const result = await authService.verifyMagicLink(token, req.headers['user-agent']);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async verifyLoginCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, code } = req.body as { email: string; code: string };
      const result = await authService.verifyLoginCode(email, code, req.headers['user-agent']);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refresh(refreshToken);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async revokeAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.body;
      await authService.revokeAllForUser(userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userRepository } = await import('../repositories');
      const user = await userRepository.findById(req.user!.userId);
      if (!user) {
        res.status(404).json({ error: 'Benutzer nicht gefunden' });
        return;
      }

      const { resolveUserPermissions } = await import('../core/permissions');
      const permissions = resolveUserPermissions(user);
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
        roleTemplate: user.roleTemplate ?? null,
        permissions,
      });
    } catch (err) {
      next(err);
    }
  },
};
