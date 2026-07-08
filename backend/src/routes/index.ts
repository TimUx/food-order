import { Router } from 'express';
import { authController } from '../controllers/authController';
import { eventController } from '../controllers/eventController';
import { foodItemController } from '../controllers/foodItemController';
import { orderController } from '../controllers/orderController';
import { clubController } from '../controllers/clubController';
import { userController } from '../controllers/userController';
import { authenticate, requireRole, loadUser } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import {
  loginSchema,
  createEventSchema,
  updateEventSchema,
  updateClubSchema,
  createFoodItemSchema,
  updateFoodItemSchema,
  createOnlineOrderSchema,
  createCashierOrderSchema,
  updateOrderStatusSchema,
  lookupOrderSchema,
  lookupByNumberSchema,
  cancelOrderSchema,
  updateEmailSettingsSchema,
  idParamSchema,
  createUserSchema,
  updateUserSchema,
} from '../validation/schemas';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import fs from 'fs';

const uploadDir = config.uploadsDir;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

// Health
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth
router.post('/auth/login', validateBody(loginSchema), authController.login);
router.get('/auth/me', authenticate, loadUser, authController.me);

// Public
router.get('/public/club', clubController.getPublic);
router.get('/public/order-settings', clubController.getOrderSettings);
router.get('/public/event', eventController.getActive);
router.get('/public/menu', foodItemController.getPublic);
router.post('/public/orders', validateBody(createOnlineOrderSchema), orderController.createOnline);
router.post('/public/orders/lookup', validateBody(lookupOrderSchema), orderController.lookup);
router.get('/public/orders/:id', validateParams(idParamSchema), orderController.getById);
router.post('/public/orders/:id/cancel', validateParams(idParamSchema), validateBody(cancelOrderSchema), orderController.cancelOnline);
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
    const imageUrl = `/uploads/${req.file.filename}`;
    const item = await foodItemService.update(req.params.id as string, { imageUrl });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.get('/staff/events/:eventId/orders', requireRole('ADMIN', 'STAFF'), orderController.getByEvent);
router.get('/staff/events/:eventId/stats', requireRole('ADMIN', 'STAFF'), orderController.getStats);
router.post('/staff/orders/cashier', requireRole('ADMIN', 'STAFF'), validateBody(createCashierOrderSchema), orderController.createCashier);
router.post('/staff/orders/lookup', requireRole('ADMIN', 'STAFF'), validateBody(lookupByNumberSchema), orderController.lookupByNumber);
router.patch('/staff/orders/:id/status', requireRole('ADMIN', 'STAFF'), validateParams(idParamSchema), validateBody(updateOrderStatusSchema), orderController.updateStatus);
router.post('/staff/orders/:id/advance', requireRole('ADMIN', 'STAFF'), validateParams(idParamSchema), orderController.advanceStatus);

router.get('/staff/club', requireRole('ADMIN'), clubController.get);
router.put('/staff/club', requireRole('ADMIN'), validateBody(updateClubSchema), clubController.update);
router.post('/staff/club/logo', requireRole('ADMIN'), upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Kein Bild hochgeladen' });
      return;
    }
    const { clubService } = await import('../services/clubService');
    const logoUrl = `/uploads/${req.file.filename}`;
    const club = await clubService.update({ logoUrl });
    res.json(club);
  } catch (err) {
    next(err);
  }
});

// Admin – Verein, Benutzer
router.use('/admin', authenticate, loadUser, requireRole('ADMIN'));

router.get('/admin/club', clubController.get);
router.put('/admin/club', validateBody(updateClubSchema), clubController.update);
router.get('/admin/email-settings', clubController.getEmailSettings);
router.put('/admin/email-settings', validateBody(updateEmailSettingsSchema), clubController.updateEmailSettings);
router.post('/admin/club/logo', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Kein Bild hochgeladen' });
      return;
    }
    const { clubService } = await import('../services/clubService');
    const logoUrl = `/uploads/${req.file.filename}`;
    const club = await clubService.update({ logoUrl });
    res.json(club);
  } catch (err) {
    next(err);
  }
});

router.get('/admin/users', userController.list);
router.post('/admin/users', validateBody(createUserSchema), userController.create);
router.put('/admin/users/:id', validateParams(idParamSchema), validateBody(updateUserSchema), userController.update);

export default router;
