import { Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { AuthRequest } from '../middleware/auth';

export const authController = {
  async login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json(result);
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
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
      });
    } catch (err) {
      next(err);
    }
  },
};
