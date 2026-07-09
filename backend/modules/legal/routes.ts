import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import { z } from 'zod';
import type { FeatureContext } from '../../src/module-system/types';
import { requirePermission } from '../../src/middleware/permission';
import { LEGAL_PAGE_TYPES, LEGAL_PERMISSIONS } from './config';
import { legalPageService } from './services/LegalPageService';

const updatePageSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  published: z.boolean().optional(),
  contentHtml: z.string().optional(),
});

const previewSchema = z.object({
  pageType: z.enum(LEGAL_PAGE_TYPES),
  contentHtml: z.string().default(''),
});

function wrap(
  permission: string,
  handler: (req: Request, res: Response) => Promise<void>
): RequestHandler[] {
  return [
    requirePermission(permission),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await handler(req, res);
      } catch (err) {
        next(err);
      }
    },
  ];
}

export function createLegalAdminRoutes(_context: FeatureContext): Router {
  const router = Router();

  router.get('/pages', ...wrap(LEGAL_PERMISSIONS.VIEW, async (_req, res) => {
    res.json(await legalPageService.listAdminPages());
  }));

  router.put('/pages/:pageType', ...wrap(LEGAL_PERMISSIONS.MANAGE, async (req, res) => {
    const pageType = z.enum(LEGAL_PAGE_TYPES).parse(req.params.pageType);
    const body = updatePageSchema.parse(req.body);
    res.json(await legalPageService.updatePage(pageType, body));
  }));

  router.post('/preview', ...wrap(LEGAL_PERMISSIONS.VIEW, async (req, res) => {
    const body = previewSchema.parse(req.body);
    res.json({
      html: await legalPageService.previewHtml(body.pageType, body.contentHtml),
    });
  }));

  return router;
}
