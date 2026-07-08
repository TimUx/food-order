import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, loadUser, requireRole } from '../../middleware/auth';
import { moduleManager, moduleRegistry } from '../../module-system';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

router.use(authenticate, loadUser, requireRole('ADMIN'));

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await moduleRegistry.getAllModuleInfo());
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mod = moduleRegistry.getModule(req.params.id as string);
    if (!mod) throw new AppError(404, 'Modul nicht gefunden');
    const info = (await moduleRegistry.getAllModuleInfo()).find((m) => m.id === req.params.id);
    res.json(info);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/install', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await moduleManager.installModule(req.params.id as string);
    const info = (await moduleRegistry.getAllModuleInfo()).find((m) => m.id === req.params.id);
    res.json(info);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/uninstall', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await moduleManager.uninstallModule(req.params.id as string);
    const info = (await moduleRegistry.getAllModuleInfo()).find((m) => m.id === req.params.id);
    res.json(info);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await moduleManager.activateModule(req.params.id as string);
    const info = (await moduleRegistry.getAllModuleInfo()).find((m) => m.id === req.params.id);
    res.json(info);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/deactivate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await moduleManager.deactivateModule(req.params.id as string);
    const info = (await moduleRegistry.getAllModuleInfo()).find((m) => m.id === req.params.id);
    res.json(info);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reinitialize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await moduleManager.reinitializeModule(req.params.id as string);
    const info = (await moduleRegistry.getAllModuleInfo()).find((m) => m.id === req.params.id);
    res.json(info);
  } catch (err) {
    next(err);
  }
});

// Legacy aliases
router.post('/:id/enable', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await moduleManager.enableModule(req.params.id as string);
    const info = (await moduleRegistry.getAllModuleInfo()).find((m) => m.id === req.params.id);
    res.json(info);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/disable', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await moduleManager.disableModule(req.params.id as string);
    const info = (await moduleRegistry.getAllModuleInfo()).find((m) => m.id === req.params.id);
    res.json(info);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await moduleManager.getModuleConfig(req.params.id as string));
  } catch (err) {
    next(err);
  }
});

router.put('/:id/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await moduleManager.updateModuleConfig(req.params.id as string, req.body);
    res.json(await moduleManager.getModuleConfig(req.params.id as string));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await moduleManager.runHealthCheck(req.params.id as string));
  } catch (err) {
    next(err);
  }
});

export default router;
