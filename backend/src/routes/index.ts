import { Router } from 'express';
import { getLegalContentRegistry, getPaymentServiceRegistry } from '../core/extensionPoints';
import { authController } from '../controllers/authController';
import { eventController } from '../controllers/eventController';
import { foodItemController } from '../controllers/foodItemController';
import { orderController } from '../controllers/orderController';
import { realtimeController } from '../controllers/realtimeController';
import { clubController } from '../controllers/clubController';
import { userController } from '../controllers/userController';
import { authenticate, requireRole, loadUser, requireDelegatedAdmin, requireStaffPermission, requireAnyStaffPermission, requirePermissionKey } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import {
  loginSchema,
  refreshTokenSchema,
  revokeAllSessionsSchema,
  magicLinkRequestSchema,
  loginCodeRequestSchema,
  verifyMagicLinkSchema,
  verifyLoginCodeSchema,
  setupStepSchema,
  setupCompleteSchema,
  createEventSchema,
  updateEventSchema,
  updateClubSchema,
  createFoodItemSchema,
  updateFoodItemSchema,
  createOnlineOrderSchema,
  createOrderCheckoutSchema,
  createCashierOrderSchema,
  abortCashierPaymentSchema,
  updateOrderStatusSchema,
  lookupOrderSchema,
  lookupByNumberSchema,
  cancelOrderSchema,
  updateEmailSettingsSchema,
  idParamSchema,
  tokenParamSchema,
  createUserSchema,
  updateUserPermissionsSchema,
  updateUserSchema,
  submitTenantApplicationSchema,
  legalSlugParamSchema,
} from '../validation/schemas';

import { uploadService } from '../services/uploadService';
import { loginRateLimiter, magicLinkRateLimiter, publicOrderRateLimiter, lookupRateLimiter, authRefreshRateLimiter, uploadRateLimiter, paymentPublicRateLimiter, tenantApplicationRateLimiter } from '../middleware/rateLimit';
import { setupController } from '../controllers/setupController';
import { config } from '../config';
import { openApiDocument } from '../core/openapi';
import moduleAdminRoutes from '../core/routes/modules';
import settingsRoutes from '../core/routes/settings';
import permissionsRoutes from '../core/routes/permissions';
import adminUiRoutes from '../core/routes/adminUi';
import { tenantController, healthService, tenantService } from '../platform/bootstrap';
import platformRoutes from '../core/routes/platform';
import { platformPublicController } from '../controllers/platformPublicController';

const upload = uploadService.memory;

const router = Router();

// Plattform-Administration (kein Mandanten-Kontext)
router.use('/platform', platformRoutes);

// Health & API-Dokumentation
router.get('/health', async (req, res) => {
  const defaultTenantExists = await tenantService.exists({ slug: 'default' });
  const tenantHealth = await healthService.checkTenantInfrastructure(defaultTenantExists);
  let resolverOk = true;
  try {
    const { tenantResolver } = await import('../platform/bootstrap');
    await tenantResolver.resolve(req);
  } catch {
    resolverOk = false;
  }

  const { prisma } = await import('../config/database');
  const dbStart = performance.now();
  let dbLatencyMs = -1;
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Math.round(performance.now() - dbStart);
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const { getSocketStats } = await import('../socket');
  const { performanceMetrics } = await import('../platform/metrics/performanceMetrics');

  const ok = tenantHealth.tenantContextReady && tenantHealth.defaultTenantAvailable && resolverOk && dbOk;
  res.json({
    status: ok ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    tenant: tenantHealth,
    resolver: { ok: resolverOk },
    database: { ok: dbOk, latencyMs: dbLatencyMs },
    websockets: getSocketStats(),
    performance: {
      slowApiThresholdMs: Number(process.env.SLOW_API_MS ?? 500),
      topEndpoints: performanceMetrics.getApiSummary(5),
    },
  });
});
router.get('/openapi.json', (_req, res) => {
  if (config.nodeEnv === 'production') {
    res.status(404).json({ error: 'Nicht gefunden' });
    return;
  }
  res.json(openApiDocument);
});

// Auth
router.get('/public/auth-config', authController.getAuthConfig);
router.post('/auth/login', loginRateLimiter, validateBody(loginSchema), authController.login);
router.post('/auth/magic-link', magicLinkRateLimiter, validateBody(magicLinkRequestSchema), authController.requestMagicLink);
router.post('/auth/login-code', magicLinkRateLimiter, validateBody(loginCodeRequestSchema), authController.requestLoginCode);
router.post('/auth/verify-magic-link', magicLinkRateLimiter, validateBody(verifyMagicLinkSchema), authController.verifyMagicLink);
router.post('/auth/verify-login-code', magicLinkRateLimiter, validateBody(verifyLoginCodeSchema), authController.verifyLoginCode);
router.post('/auth/logout', authRefreshRateLimiter, validateBody(refreshTokenSchema), authController.logout);
router.post('/auth/refresh', authRefreshRateLimiter, validateBody(refreshTokenSchema), authController.refresh);
router.post('/auth/revoke-all', authenticate, loadUser, requireRole('ADMIN'), validateBody(revokeAllSessionsSchema), authController.revokeAll);
router.get('/auth/me', authenticate, loadUser, authController.me);

// Initial Setup Wizard
router.get('/setup/status', authenticate, loadUser, requireRole('ADMIN'), setupController.getStatus);
router.post('/setup/step', authenticate, loadUser, requireRole('ADMIN'), validateBody(setupStepSchema), setupController.saveStep);
router.post('/setup/complete', authenticate, loadUser, requireRole('ADMIN'), validateBody(setupCompleteSchema), setupController.complete);
router.post('/setup/reset', authenticate, loadUser, requireRole('ADMIN'), setupController.reset);

// Public
router.get('/public/routing-config', tenantController.getRoutingConfig);
router.get('/public/health', tenantController.getPublicHealth);
router.get('/public/platform', platformPublicController.getPlatform);
router.get('/public/platform/legal-links', platformPublicController.listLegalLinks);
router.get('/public/platform/legal/:slug', validateParams(legalSlugParamSchema), platformPublicController.getLegalPage);
router.post(
  '/public/tenant-applications',
  tenantApplicationRateLimiter,
  validateBody(submitTenantApplicationSchema),
  platformPublicController.submitApplication
);
router.get('/public/tenant', tenantController.getPublic);
router.get('/public/club', clubController.getPublic);
router.get('/public/order-settings', clubController.getOrderSettings);
router.get('/public/event', eventController.getActive);
router.get('/public/menu', foodItemController.getPublic);
router.post('/public/orders', publicOrderRateLimiter, validateBody(createOnlineOrderSchema), orderController.createOnline);
router.post('/public/orders/lookup', lookupRateLimiter, validateBody(lookupOrderSchema), orderController.lookup);
router.post('/public/orders/:id/checkout', publicOrderRateLimiter, validateParams(idParamSchema), validateBody(createOrderCheckoutSchema), orderController.createCheckout);
router.get('/public/orders/status/:token', lookupRateLimiter, validateParams(tokenParamSchema), orderController.getByLookupToken);
router.post('/public/orders/:token/cancel', lookupRateLimiter, validateParams(tokenParamSchema), validateBody(cancelOrderSchema), orderController.cancelOnline);
router.get('/public/pickup-board', orderController.getReady);

// Staff - Orders
router.use('/staff', authenticate, loadUser);

router.get('/staff/events', requireAnyStaffPermission('orders.view', 'orders.kitchen', 'orders.manage', 'orders.pickup', 'food.view', 'food.edit', 'events.manage'), eventController.getAll);
router.get('/staff/events/active', requireAnyStaffPermission('orders.view', 'orders.kitchen', 'orders.manage', 'orders.pickup', 'food.view', 'food.edit', 'events.manage'), eventController.getActive);
router.post('/staff/events', requirePermissionKey('events.manage'), validateBody(createEventSchema), eventController.create);
router.put('/staff/events/:id', requirePermissionKey('events.manage'), validateParams(idParamSchema), validateBody(updateEventSchema), eventController.update);
router.post('/staff/events/:id/activate', requirePermissionKey('events.manage'), validateParams(idParamSchema), eventController.setActive);

router.get('/staff/events/:eventId/food-items', requireAnyStaffPermission('orders.view', 'orders.kitchen', 'food.view', 'food.edit'), foodItemController.getByEvent);
router.post('/staff/events/:eventId/food-items', requirePermissionKey('food.edit'), validateBody(createFoodItemSchema), foodItemController.create);
router.put('/staff/food-items/:id', requirePermissionKey('food.edit'), validateParams(idParamSchema), validateBody(updateFoodItemSchema), foodItemController.update);
router.delete('/staff/food-items/:id', requirePermissionKey('food.edit'), validateParams(idParamSchema), foodItemController.delete);

router.post('/staff/food-items/:id/image', requirePermissionKey('food.edit'), uploadRateLimiter, validateParams(idParamSchema), upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Kein Bild hochgeladen' });
      return;
    }
    const { foodItemService } = await import('../services/foodItemService');
    const { imageUrl } = await uploadService.saveProcessedImage(req.file, 'food');
    const item = await foodItemService.update(req.params.id as string, { imageUrl });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.get('/staff/events/:eventId/orders', requireAnyStaffPermission('orders.view', 'orders.kitchen', 'orders.manage', 'orders.pickup'), orderController.getByEvent);
router.get('/staff/events/:eventId/stats', requireAnyStaffPermission('orders.view', 'orders.kitchen', 'orders.manage'), orderController.getStats);
router.post('/staff/orders/cashier', requireStaffPermission('orders.manage'), validateBody(createCashierOrderSchema), orderController.createCashier);
router.post('/staff/orders/:id/abort-payment', requireStaffPermission('orders.manage'), validateParams(idParamSchema), validateBody(abortCashierPaymentSchema), orderController.abortCashierPayment);
router.post('/staff/orders/lookup', requireAnyStaffPermission('orders.view', 'orders.kitchen', 'orders.manage', 'orders.pickup'), validateBody(lookupByNumberSchema), orderController.lookupByNumber);
router.patch('/staff/orders/:id/status', requireAnyStaffPermission('orders.kitchen', 'orders.manage'), validateParams(idParamSchema), validateBody(updateOrderStatusSchema), orderController.updateStatus);
router.post('/staff/orders/:id/advance', requireAnyStaffPermission('orders.kitchen', 'orders.pickup', 'orders.manage'), validateParams(idParamSchema), orderController.advanceStatus);

// Realtime sync (delta/ETag) — für Polling-Fallback
router.get('/realtime/events/:eventId/orders', requireAnyStaffPermission('orders.view', 'orders.kitchen', 'orders.manage', 'orders.pickup'), realtimeController.syncEventOrders);
router.get('/realtime/events/:eventId/stats', requireAnyStaffPermission('orders.view', 'orders.kitchen', 'orders.manage'), realtimeController.syncEventStats);
router.get('/realtime/pickup-board', realtimeController.syncPickupBoard);
router.get('/realtime/orders/:token', realtimeController.syncOrder);
router.get('/realtime/payment/:sessionId', realtimeController.syncPayment);
router.get('/realtime/club', realtimeController.syncClub);

router.get('/staff/club', requirePermissionKey('settings.club'), clubController.get);
router.put('/staff/club', requirePermissionKey('settings.club'), validateBody(updateClubSchema), clubController.update);
router.post('/staff/club/logo', requirePermissionKey('settings.club'), uploadRateLimiter, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Kein Bild hochgeladen' });
      return;
    }
    const { clubService } = await import('../services/clubService');
    const { imageUrl } = await uploadService.saveProcessedImage(req.file, 'logo');
    const club = await clubService.update({ logoUrl: imageUrl });
    res.json(club);
  } catch (err) {
    next(err);
  }
});

// Admin – delegated access for STAFF with fachliche Rechte
router.use('/admin', authenticate, loadUser, requireDelegatedAdmin());

router.get('/admin/club', requireAnyStaffPermission('settings.club', 'team.manage'), clubController.get);
router.put('/admin/club', requirePermissionKey('settings.club'), validateBody(updateClubSchema), clubController.update);
/** @deprecated Nutze /api/admin/settings/module.notifications */
router.get('/admin/email-settings', (req, res, next) => {
  res.set('Deprecation', 'true');
  res.set('Link', '</api/admin/settings/module.notifications>; rel="successor-version"');
  return clubController.getEmailSettings(req, res, next);
});
router.put('/admin/email-settings', validateBody(updateEmailSettingsSchema), (req, res, next) => {
  res.set('Deprecation', 'true');
  res.set('Link', '</api/admin/settings/module.notifications>; rel="successor-version"');
  return clubController.updateEmailSettings(req, res, next);
});
router.post('/admin/club/logo', requirePermissionKey('settings.club'), upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Kein Bild hochgeladen' });
      return;
    }
    const { clubService } = await import('../services/clubService');
    const { imageUrl } = await uploadService.saveProcessedImage(req.file, 'logo');
    const club = await clubService.update({ logoUrl: imageUrl });
    res.json(club);
  } catch (err) {
    next(err);
  }
});

router.get('/admin/users', requirePermissionKey('team.manage'), userController.list);
router.post('/admin/users', requirePermissionKey('team.manage'), validateBody(createUserSchema), userController.create);
router.put('/admin/users/:id', requirePermissionKey('team.manage'), validateParams(idParamSchema), validateBody(updateUserSchema), userController.update);
router.put('/admin/users/:id/permissions', requirePermissionKey('team.manage'), validateParams(idParamSchema), validateBody(updateUserPermissionsSchema), userController.updatePermissions);

router.use('/admin/modules', moduleAdminRoutes);
router.use('/admin/permissions', permissionsRoutes);
router.use('/admin/settings', settingsRoutes);
router.use('/admin/ui', adminUiRoutes);

router.get('/public/modules/menu', async (_req, res) => {
  const { moduleRegistry } = await import('../platform/bootstrap');
  res.json(moduleRegistry.getMenuItems());
});

router.get('/public/legal-links', async (_req, res) => {
  res.json({ links: await getLegalContentRegistry().listPublicLinks() });
});

router.get('/public/legal/:slug', async (req, res) => {
  const page = await getLegalContentRegistry().getPublicPageBySlug(req.params.slug as string);
  if (!page) {
    res.status(404).json({ error: 'Rechtliche Seite nicht gefunden' });
    return;
  }
  res.json(page);
});

router.get('/public/payment/status', async (_req, res) => {
  res.json({ available: await getPaymentServiceRegistry().isAvailable() });
});

router.get('/public/payment/methods', async (_req, res) => {
  const { settingsServiceInstance } = await import('../platform/bootstrap');
  let allowCashOnSite = true;
  try {
    const paymentConfig = await settingsServiceInstance.getDecryptedValues('module.payment') as { allowCashOnSite?: boolean };
    allowCashOnSite = paymentConfig?.allowCashOnSite !== false;
  } catch {
    /* Modul nicht installiert */
  }

  const available = await getPaymentServiceRegistry().isAvailable();
  if (!available) {
    res.json({ allowCashOnSite, methods: [] });
    return;
  }
  const methods = await getPaymentServiceRegistry().getAvailablePaymentMethods();
  res.json({
    allowCashOnSite,
    methods: methods.map(({ providerId, supportedPaymentMethods, ...publicMethod }) => ({
      ...publicMethod,
      methodId: providerId,
      supportedMethods: supportedPaymentMethods,
    })),
  });
});

router.get('/public/payment/checkout/:sessionId/status', paymentPublicRateLimiter, async (req, res, next) => {
  try {
    const sessionId = String(req.params.sessionId);
    const status = await getPaymentServiceRegistry().getPaymentStatus(sessionId);
    if (!status) {
      res.status(404).json({ error: 'Zahlung nicht gefunden' });
      return;
    }
    res.json(status);
  } catch (err) {
    next(err);
  }
});

router.post('/public/payment/checkout/:sessionId/retry', paymentPublicRateLimiter, async (req, res, next) => {
  try {
    const sessionId = String(req.params.sessionId);
    const result = await getPaymentServiceRegistry().retryCheckout(sessionId);
    if (!result) {
      res.status(404).json({ error: 'Zahlung kann nicht wiederholt werden' });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
