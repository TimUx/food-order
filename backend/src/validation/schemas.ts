import { z } from 'zod';
import { isAllowedTenantBrandColorId } from '../core/branding/tenantBrandPalette';
import {
  normalizeOptionalWebsite,
  normalizeTenantSubdomain,
  optionalTruncatedInt,
} from '../utils/tenantApplicationInput';

const credentialLoginSchema = z
  .object({
    identifier: z.string().min(1).optional(),
    email: z.string().email('Ungültige E-Mail-Adresse').optional(),
    password: z.string().min(1, 'Passwort erforderlich'),
  })
  .superRefine((data, ctx) => {
    if (!data.identifier?.trim() && !data.email?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Benutzername oder E-Mail erforderlich',
        path: ['identifier'],
      });
    }
  });

export const loginSchema = credentialLoginSchema;
export const platformLoginSchema = credentialLoginSchema;

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'Benutzername oder E-Mail erforderlich'),
  loginPath: z.string().optional(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token erforderlich'),
  newPassword: z.string().min(4, 'Passwort erforderlich'),
});

export const updateTenantProfileSchema = z.object({
  firstName: z.string().min(1, 'Vorname erforderlich').optional(),
  lastName: z.string().min(1, 'Nachname erforderlich').optional(),
  email: z.string().email('Ungültige E-Mail-Adresse').optional(),
  username: z.string().min(3).max(32).optional().nullable(),
  passwordEnabled: z.boolean().optional(),
  magicLinkEnabled: z.boolean().optional(),
  notificationEmailsEnabled: z.boolean().optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8, 'Mindestens 8 Zeichen').optional(),
}).superRefine((data, ctx) => {
  if (data.newPassword && !data.currentPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Aktuelles Passwort erforderlich',
      path: ['currentPassword'],
    });
  }
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

const roleTemplateIdSchema = z.enum(['kueche', 'abholung', 'kasse', 'speisenpflege', 'finanzen', 'rechtliches']);

export const createUserSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse').optional().or(z.literal('')),
  username: z.string().min(3).max(32).optional().or(z.literal('')),
  password: z.string().min(4, 'Mindestens 4 Zeichen').optional(),
  firstName: z.string().min(1, 'Vorname erforderlich'),
  lastName: z.string().min(1, 'Nachname erforderlich'),
  role: z.enum(['ADMIN', 'STAFF']),
  roleTemplate: roleTemplateIdSchema.optional(),
  roleTemplates: z.array(roleTemplateIdSchema).min(1).optional(),
  permissions: z.array(z.string()).optional(),
  passwordEnabled: z.boolean().optional(),
  magicLinkEnabled: z.boolean().optional(),
  notificationEmailsEnabled: z.boolean().optional(),
});

export const updateUserPermissionsSchema = z.object({
  permissions: z.array(z.string()).default([]),
  roleTemplate: roleTemplateIdSchema.nullable().optional(),
  roleTemplates: z.array(roleTemplateIdSchema).min(1).optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse').optional().nullable().or(z.literal('')),
  username: z.string().min(3).max(32).optional().nullable().or(z.literal('')),
  password: z.string().min(4, 'Mindestens 4 Zeichen').optional(),
  firstName: z.string().min(1, 'Vorname erforderlich').optional(),
  lastName: z.string().min(1, 'Nachname erforderlich').optional(),
  role: z.enum(['ADMIN', 'STAFF']).optional(),
  active: z.boolean().optional(),
  passwordEnabled: z.boolean().optional(),
  magicLinkEnabled: z.boolean().optional(),
  notificationEmailsEnabled: z.boolean().optional(),
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
  isActive: z.boolean().optional(),
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
  cancellationDeadlineHours: z.number().int().min(0, 'Mindestens 0').max(720, 'Maximal 720 Stunden').optional(),
  cancellationDeadlineUnit: z.enum(['hours', 'days']).optional(),
});

export const updateClubBrandColorSchema = z.object({
  brandColor: z
    .string()
    .min(1)
    .refine((value) => isAllowedTenantBrandColorId(value), 'Ungültige Primärfarbe'),
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

export const setFoodSoldOutSchema = z.object({
  soldOut: z.boolean(),
  eventId: z.string().uuid().optional(),
});

export const setEventFoodAssignmentsSchema = z.object({
  foodItemIds: z.array(z.string().uuid()),
});

export const orderItemSchema = z.object({
  foodItemId: z.string().uuid(),
  quantity: z.number().int().positive('Menge muss mindestens 1 sein'),
});

export const createOrderCheckoutSchema = z.object({
  paymentMethodId: z.string().min(1, 'Zahlungsart erforderlich'),
});

export const createOnlineOrderSchema = z.object({
  eventId: z.string().uuid('Veranstaltung erforderlich'),
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
  eventId: z.string().uuid('Veranstaltung erforderlich'),
  items: z.array(orderItemSchema).min(1, 'Mindestens ein Gericht erforderlich'),
  paymentMethodId: z.string().optional(),
});

export const abortCashierPaymentSchema = z.object({
  sessionId: z.string().min(1, 'Session erforderlich'),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'READY', 'PICKED_UP', 'CANCELLED']),
});

export const updateOrderItemsSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Mindestens ein Gericht erforderlich'),
});

export const lookupOrderSchema = z.object({
  eventId: z.string().uuid('Veranstaltung erforderlich'),
  orderNumber: z.coerce.number().int().positive(),
  lastName: z.string().min(1, 'Nachname erforderlich'),
});

export const lookupByNumberSchema = z.object({
  eventId: z.string().uuid('Veranstaltung erforderlich'),
  orderNumber: z.coerce.number().int().positive(),
  lastName: z.string().max(100).optional(),
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
  token: z.string().refine(
    (value) => /^[a-f0-9]{64}$/.test(value) || z.string().uuid().safeParse(value).success,
    'Ungültiger Bestell-Token'
  ),
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
  phone: z.string().max(40).optional().or(z.literal('')),
  website: z.preprocess(
    normalizeOptionalWebsite,
    z.string().url('Ungültige URL').optional()
  ),
  memberCount: z.preprocess(
    optionalTruncatedInt,
    z.number().int().min(0, 'Anzahl Mitglieder darf nicht negativ sein').max(1_000_000).optional()
  ),
  eventsPerYear: z.preprocess(
    optionalTruncatedInt,
    z.number().int().min(0, 'Veranstaltungen pro Jahr darf nicht negativ sein').max(10_000).optional()
  ),
  reason: z.string().min(20, 'Bitte ausführlicher begründen (mindestens 20 Zeichen)').max(5000),
  desiredFeatures: z.string().min(10, 'Bitte gewünschte Funktionen angeben (mindestens 10 Zeichen)').max(3000),
  freeTierJustification: z.string().min(20, 'Bitte Begründung angeben (mindestens 20 Zeichen)').max(3000),
  plannedUsage: z.string().min(10, 'Geplante Nutzung angeben (mindestens 10 Zeichen)').max(3000),
  notes: z.string().max(3000).optional(),
  requestedSubdomain: z.preprocess(
    (value) => (typeof value === 'string' ? normalizeTenantSubdomain(value) : value),
    z
      .string()
      .min(3, 'Internetadresse: mindestens 3 Zeichen')
      .max(48)
      .regex(/^[a-z0-9-]+$/, 'Nur Buchstaben, Zahlen und Bindestriche')
  ),
  privacyAccepted: z.literal(true, { errorMap: () => ({ message: 'Datenschutzerklärung muss akzeptiert werden' }) }),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: 'Nutzungsbedingungen müssen akzeptiert werden' }) }),
  _hp: z.string().optional(),
  formStartedAt: z.number().int().positive(),
  turnstileToken: z.string().optional(),
});

export const updateTenantApplicationStatusSchema = z.object({
  status: z.enum(['NEW', 'UNDER_REVIEW', 'CLARIFICATION', 'APPROVED', 'REJECTED', 'ARCHIVED']),
  adminComment: z.string().max(5000).optional(),
});

export const approveTenantApplicationSchema = z.object({
  createTenant: z.boolean().optional(),
  adminComment: z.string().max(5000).optional(),
});

export const linkTenantApplicationSchema = z.object({
  tenantId: z.string().uuid().nullable(),
});

const platformTenantSlugSchema = z
  .string()
  .min(2, 'Mindestens 2 Zeichen')
  .max(48, 'Maximal 48 Zeichen')
  .regex(/^[a-z0-9-]+$/, 'Nur Kleinbuchstaben, Zahlen und Bindestriche');

const optionalEmailSchema = z
  .string()
  .email('Ungültige E-Mail-Adresse')
  .optional()
  .or(z.literal(''))
  .nullable();

const optionalUrlSchema = z
  .string()
  .url('Ungültige URL')
  .optional()
  .or(z.literal(''))
  .nullable();

export const createPlatformTenantSchema = z.object({
  name: z.string().min(2, 'Name erforderlich').max(200),
  shortName: z.string().max(64).optional().nullable(),
  slug: platformTenantSlugSchema,
  subdomain: platformTenantSlugSchema.optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED']).optional(),
  contactName: z.string().max(120).optional().nullable(),
  email: optionalEmailSchema,
  phone: z.string().max(40).optional().nullable(),
  logoUrl: optionalUrlSchema,
  locale: z.string().max(20).optional(),
  timezone: z.string().max(64).optional(),
  currency: z.string().max(8).optional(),
  theme: z.string().max(64).optional(),
  description: z.string().max(5000).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  website: optionalUrlSchema,
});

export const updatePlatformTenantSchema = createPlatformTenantSchema.partial();

export const updateTenantModuleEntitlementsSchema = z.object({
  moduleIds: z.array(z.string().min(1).max(64)),
});

export const updatePlatformLegalPageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
  published: z.boolean().optional(),
  contentHtml: z.string().max(200_000).optional(),
});

export const platformLegalPageTypeParamSchema = z.object({
  pageType: z.enum(['impressum', 'datenschutz', 'nutzungsbedingungen']),
});

export const legalSlugParamSchema = z.object({
  slug: z.string().min(1).max(100),
});

export const applicationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const backupFilenameParamSchema = z.object({
  filename: z.string().min(1).max(200).regex(/^[a-zA-Z0-9._-]+\.(sql|json)\.gz$/),
});

export const createTenantBackupSchema = z.object({
  tenantId: z.string().uuid(),
});

export const restoreBackupSchema = z.object({
  confirm: z.literal(true),
});

export const createPlatformUserSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  username: z.string().min(3).max(32).optional().or(z.literal('')),
  password: z.string().min(8, 'Mindestens 8 Zeichen').optional(),
  firstName: z.string().min(1, 'Vorname erforderlich').max(100),
  lastName: z.string().min(1, 'Nachname erforderlich').max(100),
  passwordEnabled: z.boolean().optional(),
  magicLinkEnabled: z.boolean().optional(),
});

export const updatePlatformUserSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse').optional(),
  username: z.string().min(3).max(32).optional().nullable().or(z.literal('')),
  password: z.string().min(8, 'Mindestens 8 Zeichen').optional(),
  firstName: z.string().min(1, 'Vorname erforderlich').max(100).optional(),
  lastName: z.string().min(1, 'Nachname erforderlich').max(100).optional(),
  active: z.boolean().optional(),
  passwordEnabled: z.boolean().optional(),
  magicLinkEnabled: z.boolean().optional(),
});

export const updatePlatformProfileSchema = z.object({
  firstName: z.string().min(1, 'Vorname erforderlich').max(100).optional(),
  lastName: z.string().min(1, 'Nachname erforderlich').max(100).optional(),
  email: z.string().email('Ungültige E-Mail-Adresse').optional(),
  username: z.string().min(3).max(32).optional().nullable().or(z.literal('')),
  passwordEnabled: z.boolean().optional(),
  magicLinkEnabled: z.boolean().optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8, 'Mindestens 8 Zeichen').optional(),
}).superRefine((data, ctx) => {
  if (data.newPassword && !data.currentPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Aktuelles Passwort erforderlich',
      path: ['currentPassword'],
    });
  }
});
