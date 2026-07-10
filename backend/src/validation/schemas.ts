import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort erforderlich'),
});

export const magicLinkRequestSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  loginPath: z.string().optional(),
});

export const loginCodeRequestSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
});

export const verifyMagicLinkSchema = z.object({
  token: z.string().min(1, 'Token erforderlich'),
});

export const verifyLoginCodeSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  code: z.string().min(4, 'Code erforderlich'),
});

export const platformSmtpUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  host: z.string().optional(),
  port: z.number().int().min(1).max(65535).optional(),
  user: z.string().optional(),
  pass: z.string().optional(),
  from: z.string().email().optional().or(z.literal('')),
  senderName: z.string().optional(),
  replyTo: z.string().email().optional().or(z.literal('')),
  secure: z.boolean().optional(),
  useTls: z.boolean().optional(),
  timeout: z.number().int().min(1000).max(120000).optional(),
});

export const platformTestMailSchema = z.object({
  recipient: z.string().email('Ungültige E-Mail-Adresse'),
});

export const authModeUpdateSchema = z.object({
  mode: z.enum(['passwordless_only', 'password_only', 'password_or_magic', 'password_and_magic']).optional(),
  magicLinkTtlMinutes: z.number().int().min(1).max(60).optional(),
  loginCodeTtlMinutes: z.number().int().min(1).max(30).optional(),
  loginCodeLength: z.number().int().min(4).max(8).optional(),
});

export const setupStepSchema = z.object({
  step: z.number().int().min(0).max(7),
  data: z.record(z.unknown()),
});

export const setupCompleteSchema = z.object({
  data: z.record(z.unknown()),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh-Token erforderlich'),
});

export const revokeAllSessionsSchema = z.object({
  userId: z.string().uuid('Ungültige Benutzer-ID'),
});

export const createUserSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Mindestens 8 Zeichen').optional(),
  firstName: z.string().min(1, 'Vorname erforderlich'),
  lastName: z.string().min(1, 'Nachname erforderlich'),
  role: z.enum(['ADMIN', 'STAFF']),
});

export const updateUserSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse').optional(),
  password: z.string().min(8, 'Mindestens 8 Zeichen').optional(),
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
  activateOnCreate: z.boolean().optional(),
});

export const updateEventSchema = createEventSchema.partial();

export const updateClubSchema = z.object({
  clubName: z.string().min(1, 'Name des Veranstalters erforderlich').optional(),
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

export const createOrderCheckoutSchema = z.object({
  paymentMethodId: z.string().min(1, 'Zahlungsart erforderlich'),
});

export const createOnlineOrderSchema = z.object({
  firstName: z.string().optional().or(z.literal('')),
  lastName: z.string().optional().or(z.literal('')),
  email: z.string().email('Ungültige E-Mail').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  items: z.array(orderItemSchema).min(1, 'Mindestens ein Gericht erforderlich'),
  /** Interne Methoden-ID für Onlinezahlung (vom PaymentService) */
  paymentMethodId: z.string().optional(),
  _hp: z.string().optional(),
  formStartedAt: z.number().int().positive(),
  turnstileToken: z.string().optional(),
});

export const createCashierOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Mindestens ein Gericht erforderlich'),
  paymentMethodId: z.string().optional(),
});

export const abortCashierPaymentSchema = z.object({
  sessionId: z.string().min(1, 'Session erforderlich'),
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
  lastName: z.string().min(1, 'Nachname erforderlich'),
});

export const refundPaymentSchema = z.object({
  transactionId: z.string().min(1, 'Transaktions-ID erforderlich'),
  providerId: z.string().min(1, 'Provider erforderlich'),
  amountCents: z.number().int().positive().optional(),
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

export const tokenParamSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, 'Ungültiger Bestell-Token'),
});

export const submitTenantApplicationSchema = z.object({
  organization: z.string().min(2, 'Organisation erforderlich').max(200),
  organizationType: z.string().min(2, 'Organisationstyp erforderlich').max(100),
  contactName: z.string().min(2, 'Ansprechpartner erforderlich').max(120),
  street: z.string().min(2, 'Straße erforderlich').max(200),
  postalCode: z.string().min(3, 'PLZ erforderlich').max(20),
  city: z.string().min(2, 'Ort erforderlich').max(100),
  country: z.string().max(100).optional(),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  phone: z.string().max(40).optional(),
  website: z.string().url('Ungültige URL').optional().or(z.literal('')),
  memberCount: z.number().int().min(0).max(1_000_000).optional(),
  eventsPerYear: z.number().int().min(0).max(10_000).optional(),
  reason: z.string().min(20, 'Bitte ausführlicher begründen').max(5000),
  desiredFeatures: z.string().min(10, 'Bitte gewünschte Funktionen angeben').max(3000),
  freeTierJustification: z.string().min(20, 'Bitte Begründung angeben').max(3000),
  plannedUsage: z.string().min(10, 'Geplante Nutzung angeben').max(3000),
  notes: z.string().max(3000).optional(),
  requestedSubdomain: z.string().min(3, 'Subdomain mind. 3 Zeichen').max(48).regex(/^[a-z0-9-]+$/i, 'Nur Buchstaben, Zahlen und Bindestriche'),
  privacyAccepted: z.literal(true, { errorMap: () => ({ message: 'Datenschutzerklärung muss akzeptiert werden' }) }),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: 'Nutzungsbedingungen müssen akzeptiert werden' }) }),
});

export const updateTenantApplicationStatusSchema = z.object({
  status: z.enum(['NEW', 'UNDER_REVIEW', 'CLARIFICATION', 'APPROVED', 'REJECTED', 'ARCHIVED']),
  adminComment: z.string().max(5000).optional(),
});

export const approveTenantApplicationSchema = z.object({
  createTenant: z.boolean().optional(),
  adminComment: z.string().max(5000).optional(),
});

export const updatePlatformLegalPageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
  published: z.boolean().optional(),
  contentHtml: z.string().max(200_000).optional(),
});

export const legalSlugParamSchema = z.object({
  slug: z.string().min(1).max(100),
});

export const applicationIdParamSchema = z.object({
  id: z.string().uuid(),
});
