import { Router } from 'express';
import { authController } from '../controllers/authController';
import { eventController } from '../controllers/eventController';
import { foodItemController } from '../controllers/foodItemController';
import { orderController } from '../controllers/orderController';
import { realtimeController } from '../controllers/realtimeController';
import { clubController } from '../controllers/clubController';
import { userController } from '../controllers/userController';
import { authenticate, requireRole, loadUser } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import {
  loginSchema,
  refreshTokenSchema,
  revokeAllSessionsSchema,
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
  updateUserSchema,
} from '../validation/schemas';

import { uploadService } from '../services/uploadService';
import { loginRateLimiter, publicOrderRateLimiter, lookupRateLimiter } from '../middleware/rateLimit';
import { openApiDocument } from '../core/openapi';
import moduleAdminRoutes from '../core/routes/modules';
import settingsRoutes from '../core/routes/settings';
import permissionsRoutes from '../core/routes/permissions';
import adminUiRoutes from '../core/routes/adminUi';

const upload = uploadService.memory;

const router = Router();

// Health & API-Dokumentation
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
router.get('/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});

// Auth
router.post('/auth/login', loginRateLimiter, validateBody(loginSchema), authController.login);
router.post('/auth/logout', validateBody(refreshTokenSchema), authController.logout);
router.post('/auth/refresh', loginRateLimiter, validateBody(refreshTokenSchema), authController.refresh);
router.post('/auth/revoke-all', authenticate, loadUser, requireRole('ADMIN'), validateBody(revokeAllSessionsSchema), authController.revokeAll);
router.get('/auth/me', authenticate, loadUser, authController.me);

// Public
router.get('/public/club', clubController.getPublic);
router.get('/public/order-settings', clubController.getOrderSettings);
router.get('/public/event', eventController.getActive);
router.get('/public/menu', foodItemController.getPublic);
router.post('/public/orders', publicOrderRateLimiter, validateBody(createOnlineOrderSchema), orderController.createOnline);
router.post('/public/orders/lookup', lookupRateLimiter, validateBody(lookupOrderSchema), orderController.lookup);
router.post('/public/orders/:id/checkout', publicOrderRateLimiter, validateParams(idParamSchema), validateBody(createOrderCheckoutSchema), orderController.createCheckout);
router.get('/public/orders/status/:token', validateParams(tokenParamSchema), orderController.getByLookupToken);
router.post('/public/orders/:token/cancel', lookupRateLimiter, validateParams(tokenParamSchema), validateBody(cancelOrderSchema), orderController.cancelOnline);
router.get('/public/pickup-board', orderController.getReady);

// Staff - Orders
router.use('/staff', authenticate, loadUser);

router.get('/staff/events', requireRole('ADMIN', 'STAFF'), eventController.getAll);
router.get('/staff/events/active', requireRole('ADMIN', 'STAFF'), eventController.getActive);
router.post('/staff/events', requireRole('ADMIN'), validateBody(createEventSchema), eventController.create);
router.put('/staff/events/:id', requireRole('ADMIN'), validateParams(idParamSchema), validateBody(updateEventSchema), eventController.update);
router.post('/staff/events/:id/activate', requireRole('ADMIN'), validateParams(idParamSchema), eventController.setActive);

router.get('/staff/events/:eventId/food-items', requireRole('ADMIN', 'STAFF'), foodItemController.getByEvent);
router.post('/staff/events/:eventId/food-items', requireRole('ADMIN'), validateBody(createFoodItemSchema), foodItemController.create);
router.put('/staff/food-items/:id', requireRole('ADMIN'), validateParams(idParamSchema), validateBody(updateFoodItemSchema), foodItemController.update);
router.delete('/staff/food-items/:id', requireRole('ADMIN'), validateParams(idParamSchema), foodItemController.delete);

router.post('/staff/food-items/:id/image', requireRole('ADMIN'), validateParams(idParamSchema), upload.single('image'), async (req, res, next) => {
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

router.get('/staff/events/:eventId/orders', requireRole('ADMIN', 'STAFF'), orderController.getByEvent);
router.get('/staff/events/:eventId/stats', requireRole('ADMIN', 'STAFF'), orderController.getStats);
router.post('/staff/orders/cashier', requireRole('ADMIN', 'STAFF'), validateBody(createCashierOrderSchema), orderController.createCashier);
router.post('/staff/orders/:id/abort-payment', requireRole('ADMIN', 'STAFF'), validateParams(idParamSchema), validateBody(abortCashierPaymentSchema), orderController.abortCashierPayment);
router.post('/staff/orders/lookup', requireRole('ADMIN', 'STAFF'), validateBody(lookupByNumberSchema), orderController.lookupByNumber);
router.patch('/staff/orders/:id/status', requireRole('ADMIN', 'STAFF'), validateParams(idParamSchema), validateBody(updateOrderStatusSchema), orderController.updateStatus);
router.post('/staff/orders/:id/advance', requireRole('ADMIN', 'STAFF'), validateParams(idParamSchema), orderController.advanceStatus);

// Realtime sync (delta/ETag) — für Polling-Fallback
router.get('/realtime/events/:eventId/orders', requireRole('ADMIN', 'STAFF'), realtimeController.syncEventOrders);
router.get('/realtime/events/:eventId/stats', requireRole('ADMIN', 'STAFF'), realtimeController.syncEventStats);
router.get('/realtime/pickup-board', realtimeController.syncPickupBoard);
router.get('/realtime/orders/:token', realtimeController.syncOrder);
router.get('/realtime/payment/:sessionId', realtimeController.syncPayment);
router.get('/realtime/club', realtimeController.syncClub);

router.get('/staff/club', requireRole('ADMIN'), clubController.get);
router.put('/staff/club', requireRole('ADMIN'), validateBody(updateClubSchema), clubController.update);
router.post('/staff/club/logo', requireRole('ADMIN'), upload.single('image'), async (req, res, next) => {
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

// Admin – Verein, Benutzer
router.use('/admin', authenticate, loadUser, requireRole('ADMIN'));

router.get('/admin/club', clubController.get);
router.put('/admin/club', validateBody(updateClubSchema), clubController.update);
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
router.post('/admin/club/logo', upload.single('image'), async (req, res, next) => {
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

router.get('/admin/users', userController.list);
router.post('/admin/users', validateBody(createUserSchema), userController.create);
router.put('/admin/users/:id', validateParams(idParamSchema), validateBody(updateUserSchema), userController.update);

router.use('/admin/modules', moduleAdminRoutes);
router.use('/admin/permissions', permissionsRoutes);
router.use('/admin/settings', settingsRoutes);
router.use('/admin/ui', adminUiRoutes);

router.get('/public/modules/menu', async (_req, res) => {
  const { moduleRegistry } = await import('../platform/bootstrap');
  res.json(moduleRegistry.getMenuItems());
});

import { getPaymentServiceRegistry } from '../core/extensionPoints';

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

router.get('/public/payment/checkout/:sessionId/status', async (req, res, next) => {
  try {
    const status = await getPaymentServiceRegistry().getPaymentStatus(req.params.sessionId);
    if (!status) {
      res.status(404).json({ error: 'Zahlung nicht gefunden' });
      return;
    }
    res.json(status);
  } catch (err) {
    next(err);
  }
});

router.post('/public/payment/checkout/:sessionId/retry', async (req, res, next) => {
  try {
    const result = await getPaymentServiceRegistry().retryCheckout(req.params.sessionId);
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
