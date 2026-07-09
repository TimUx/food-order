import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import type { FeatureContext } from '../../src/module-system/types';
import { requirePermission } from '../../src/middleware/permission';
import { createPaymentAdminService } from './services/PaymentAdminService';
import { paymentManager } from './PaymentManager';
import { PAYMENT_PERMISSIONS, methodTypeConfigSchema } from './config';
import { refundPaymentSchema } from '../../src/validation/schemas';
import { paymentAuditRepository } from './repositories/paymentAuditRepository';
import { z } from 'zod';

const refundWithReasonSchema = refundPaymentSchema.extend({
  reason: z.string().optional(),
  comment: z.string().optional(),
  paymentId: z.string().uuid().optional(),
});

const methodTypesSchema = z.object({
  methodTypes: z.record(z.object({
    enabled: z.boolean().optional(),
    recommended: z.boolean().optional(),
    sortOrder: z.number().optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
  })),
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

export function createPaymentAdminRoutes(context: FeatureContext): Router {
  const router = Router();
  const admin = createPaymentAdminService(context);
  const P = PAYMENT_PERMISSIONS;

  router.get('/dashboard', ...wrap(P.VIEW, async (_req, res) => {
    res.json(await admin.getDashboard());
  }));

  router.get('/providers', ...wrap(P.VIEW, async (_req, res) => {
    res.json(await admin.getProviders());
  }));

  router.put('/providers/:id/enabled', ...wrap(P.PROVIDER_CONFIGURE, async (req, res) => {
    const enabled = z.object({ enabled: z.boolean() }).parse(req.body).enabled;
    res.json(await admin.setProviderEnabled(req.params.id as string, enabled));
  }));

  router.post('/providers/:id/test', ...wrap(P.PROVIDER_CONFIGURE, async (req, res) => {
    res.json(await admin.testProvider(req.params.id as string));
  }));

  router.get('/method-types', ...wrap(P.MANAGE, async (_req, res) => {
    const config = await context.getConfig('payment');
    res.json(admin.getPaymentMethodTypes(config as import('./config').PaymentConfig));
  }));

  router.put('/method-types', ...wrap(P.MANAGE, async (req, res) => {
    const body = methodTypesSchema.parse(req.body);
    const normalized = Object.fromEntries(
      Object.entries(body.methodTypes).map(([key, value]) => [key, methodTypeConfigSchema.parse(value)])
    );
    res.json(await admin.saveMethodTypes(normalized));
  }));

  router.get('/payments', ...wrap(P.VIEW, async (req, res) => {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 25;
    res.json(await admin.listPayments({
      page,
      limit,
      providerId: req.query.provider as string | undefined,
      status: req.query.status as import('./types').PaymentStatus | undefined,
      eventId: req.query.eventId as string | undefined,
    }));
  }));

  router.get('/payments/:id', ...wrap(P.VIEW, async (req, res) => {
    const detail = await admin.getPaymentDetail(req.params.id as string);
    if (!detail) {
      res.status(404).json({ error: 'Zahlung nicht gefunden' });
      return;
    }
    res.json(detail);
  }));

  router.get('/payments-export.csv', ...wrap(P.STATISTICS, async (_req, res) => {
    const { items } = await admin.listPayments({ page: 1, limit: 1000 });
    const header = 'ID;Abholnummer;Betrag;Status;Anbieter;Erstellt\n';
    const rows = items.map((p) =>
      `${p.id};${p.displayNumber ?? ''};${(p.amountCents / 100).toFixed(2)};${p.status};${p.providerId};${p.createdAt}`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="zahlungen.csv"');
    res.send('\uFEFF' + header + rows);
  }));

  router.get('/refunds', ...wrap(P.REFUND, async (req, res) => {
    const page = req.query.page ? Number(req.query.page) : 1;
    res.json(await admin.listRefunds({ page }));
  }));

  router.get('/refunds-export.csv', ...wrap(P.REFUND, async (_req, res) => {
    const { items } = await admin.listRefunds({ page: 1, limit: 1000 });
    const header = 'ID;Zahlung;Anbieter;Details;Zeitpunkt\n';
    const rows = items.map((r) =>
      `${r.id};${r.paymentId ?? ''};${r.providerId ?? ''};${JSON.stringify(r.details ?? {})};${r.createdAt}`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rueckerstattungen.csv"');
    res.send('\uFEFF' + header + rows);
  }));

  router.post('/refunds', ...wrap(P.REFUND, async (req, res) => {
    const body = refundWithReasonSchema.parse(req.body);
    const result = await paymentManager.refund(context, body.providerId, body.transactionId, body.amountCents);
    if (result.success) {
      await paymentAuditRepository.log({
        paymentId: body.paymentId,
        action: 'refund',
        providerId: body.providerId,
        details: { transactionId: body.transactionId, reason: body.reason, comment: body.comment, refundId: result.refundId },
      });
      await context.audit.log({
        action: 'payment.refund',
        moduleId: 'payment',
        details: { providerId: body.providerId, transactionId: body.transactionId },
      });
    }
    res.json(result);
  }));

  router.get('/logs', ...wrap(P.LOGS, async (req, res) => {
    const page = req.query.page ? Number(req.query.page) : 1;
    res.json(await admin.getLogs({ page, providerId: req.query.provider as string | undefined }));
  }));

  router.get('/webhooks', ...wrap(P.WEBHOOKS, async (req, res) => {
    const page = req.query.page ? Number(req.query.page) : 1;
    res.json(await admin.getWebhooks({ page }));
  }));

  router.get('/health', ...wrap(P.VIEW, async (_req, res) => {
    res.json(await admin.getHealth());
  }));

  router.get('/statistics', ...wrap(P.STATISTICS, async (req, res) => {
    const period = (req.query.period as 'today' | 'week' | 'month') ?? 'today';
    res.json(await admin.getStatistics(period));
  }));

  router.get('/statistics-export.csv', ...wrap(P.STATISTICS, async (req, res) => {
    const period = (req.query.period as 'today' | 'week' | 'month') ?? 'today';
    const stats = await admin.getStatistics(period);
    const header = 'Kennzahl;Wert\n';
    const rows = [
      `Zeitraum;${period}`,
      `Zahlungen gesamt;${stats.totalCount}`,
      `Erfolgreich;${stats.successCount}`,
      `Fehlgeschlagen;${stats.failedCount}`,
      `Umsatz (EUR);${(stats.revenueCents / 100).toFixed(2)}`,
      `Rückerstattungen;${stats.refundCount}`,
      `Erfolgsquote (%);${stats.successRate}`,
      `Fehlerrate (%);${stats.errorRate}`,
      `Refundquote (%);${stats.refundRate}`,
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="statistik-${period}.csv"`);
    res.send('\uFEFF' + header + rows);
  }));

  return router;
}
