import { AppError } from './errorHandler';

const MIN_FORM_MS = 3000;
const MAX_FORM_MS = 4 * 60 * 60 * 1000;

export interface BotProtectionPayload {
  _hp?: string;
  formStartedAt?: number;
  turnstileToken?: string;
}

async function verifyTurnstile(token: string): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return;

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  });

  const data = (await res.json()) as { success?: boolean };
  if (!data.success) {
    throw new AppError(400, 'Sicherheitsprüfung fehlgeschlagen. Bitte erneut versuchen.', 'TURNSTILE_FAILED');
  }
}

export async function validateOrderBotProtection(payload: BotProtectionPayload): Promise<void> {
  if (payload._hp && payload._hp.trim().length > 0) {
    throw new AppError(400, 'Anfrage konnte nicht verarbeitet werden', 'BOT_DETECTED');
  }

  const started = payload.formStartedAt;
  if (!started || typeof started !== 'number' || !Number.isFinite(started)) {
    throw new AppError(400, 'Anfrage konnte nicht verarbeitet werden', 'BOT_INVALID');
  }

  const elapsed = Date.now() - started;
  if (elapsed < MIN_FORM_MS) {
    throw new AppError(400, 'Bitte prüfen Sie Ihre Eingaben und versuchen Sie es erneut', 'BOT_TOO_FAST');
  }
  if (elapsed > MAX_FORM_MS) {
    throw new AppError(400, 'Sitzung abgelaufen. Bitte laden Sie die Seite neu.', 'BOT_EXPIRED');
  }

  if (process.env.TURNSTILE_SECRET_KEY) {
    if (!payload.turnstileToken) {
      throw new AppError(400, 'Sicherheitsprüfung erforderlich', 'TURNSTILE_MISSING');
    }
    await verifyTurnstile(payload.turnstileToken);
  }
}
