import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort erforderlich'),
});

export const createUserSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(6, 'Mindestens 6 Zeichen'),
  firstName: z.string().min(1, 'Vorname erforderlich'),
  lastName: z.string().min(1, 'Nachname erforderlich'),
  role: z.enum(['ADMIN', 'STAFF']),
});

export const updateUserSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse').optional(),
  password: z.string().min(6, 'Mindestens 6 Zeichen').optional(),
  firstName: z.string().min(1, 'Vorname erforderlich').optional(),
  lastName: z.string().min(1, 'Nachname erforderlich').optional(),
  role: z.enum(['ADMIN', 'STAFF']).optional(),
  active: z.boolean().optional(),
});

export const createEventSchema = z.object({
  name: z.string().min(1, 'Name erforderlich'),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum im Format YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Zeit im Format HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Zeit im Format HH:MM'),
  onlineOrdersActive: z.boolean().optional(),
  cashierActive: z.boolean().optional(),
  ordersClosed: z.boolean().optional(),
});

export const updateEventSchema = createEventSchema.partial();

export const updateClubSchema = z.object({
  clubName: z.string().min(1, 'Vereinsname erforderlich').optional(),
  description: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  email: z.string().email('Ungültige E-Mail').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  website: z.string().url('Ungültige URL').optional().nullable().or(z.literal('')),
  orderFieldFirstNameRequired: z.boolean().optional(),
  orderFieldLastNameRequired: z.boolean().optional(),
  orderFieldEmailRequired: z.boolean().optional(),
  orderFieldPhoneRequired: z.boolean().optional(),
  cancellationDeadlineHours: z.number().int().min(0, 'Mindestens 0 Stunden').max(720, 'Maximal 720 Stunden').optional(),
});

export const createFoodItemSchema = z.object({
  name: z.string().min(1, 'Name erforderlich'),
  description: z.string().optional(),
  price: z.number().positive('Preis muss positiv sein'),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
  soldOut: z.boolean().optional(),
  maxQuantity: z.number().int().positive().optional().nullable(),
});

export const updateFoodItemSchema = createFoodItemSchema.partial();

export const orderItemSchema = z.object({
  foodItemId: z.string().uuid(),
  quantity: z.number().int().positive('Menge muss mindestens 1 sein'),
});

export const createOnlineOrderSchema = z.object({
  firstName: z.string().optional().or(z.literal('')),
  lastName: z.string().optional().or(z.literal('')),
  email: z.string().email('Ungültige E-Mail').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  items: z.array(orderItemSchema).min(1, 'Mindestens ein Gericht erforderlich'),
  _hp: z.string().optional(),
  formStartedAt: z.number().int().positive(),
  turnstileToken: z.string().optional(),
});

export const createCashierOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Mindestens ein Gericht erforderlich'),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'READY', 'PICKED_UP', 'CANCELLED']),
});

export const lookupOrderSchema = z.object({
  orderNumber: z.coerce.number().int().positive(),
  lastName: z.string().min(1, 'Nachname erforderlich'),
});

export const lookupByNumberSchema = z.object({
  orderNumber: z.coerce.number().int().positive(),
});

export const cancelOrderSchema = z.object({
  lastName: z.string().min(1, 'Nachname erforderlich'),
});

export const updateEmailSettingsSchema = z.object({
  smtpHost: z.string().optional().nullable(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().optional().nullable(),
  smtpPass: z.string().optional().nullable(),
  smtpFrom: z.string().email('Ungültige Absender-E-Mail').optional().nullable().or(z.literal('')),
  emailCustomText: z.string().max(5000, 'Maximal 5000 Zeichen').optional().nullable(),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});
