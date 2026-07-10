import rateLimit from 'express-rate-limit';

/** Magic-Link / Login-Code: max. 5 Anfragen pro 15 Minuten. */
export const magicLinkRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anmeldeanfragen. Bitte später erneut versuchen.' },
});

/** Login: max. 10 Versuche pro 15 Minuten (K3). */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anmeldeversuche. Bitte später erneut versuchen.' },
});

/** Öffentliche Bestellungen: max. 30 pro Stunde pro IP (K3). */
export const publicOrderRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Bestellungen. Bitte später erneut versuchen.' },
});

/** Auth refresh/logout: max. 30 pro 15 Minuten. */
export const authRefreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte später erneut versuchen.' },
});

/** Öffentliche Zahlungs-Endpunkte: max. 60 pro 15 Minuten. */
export const paymentPublicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Zahlungsanfragen. Bitte später erneut versuchen.' },
});

/** Webhook-Endpunkte: max. 120 pro 15 Minuten pro IP. */
export const webhookRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Webhook-Anfragen.' },
});

/** Uploads: max. 20 pro Stunde. */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Uploads. Bitte später erneut versuchen.' },
});

/** Lookup-Endpunkte: max. 60 pro 15 Minuten (K3). */
export const lookupRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Suchanfragen. Bitte später erneut versuchen.' },
});

/** Mandantenbewerbungen: max. 5 pro Stunde pro IP. */
export const tenantApplicationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Bewerbungen. Bitte später erneut versuchen.' },
});
