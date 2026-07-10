import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody } from '../../middleware/validation';
import { permissionService } from '../../platform/bootstrap';
import type { AuthRequest } from '../../middleware/auth';
import { requirePermissionKey } from '../../middleware/auth';

const updateStaffPermissionsSchema = z.object({
  permissions: z.array(z.string().min(1)).default([]),
});

const updateUserPermissionsSchema = z.object({
  permissions: z.array(z.string()).default([]),
  roleTemplate: z.string().nullable().optional(),
});

const router = Router();

router.use(requirePermissionKey('team.manage'));

router.get('/', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await permissionService.getPermissionCatalog());
  } catch (err) {
    next(err);
  }
});

router.get('/templates', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ templates: permissionService.getRoleTemplates() });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/staff',
  validateBody(updateStaffPermissionsSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const permissions = await permissionService.updateStaffPermissions(
        req.body.permissions,
        req.user!.userId
      );
      res.json({ permissions, deprecated: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
