import { corsPolicy } from '../middleware/corsPolicy';

function isProductionEnv(): boolean {
  return (process.env.NODE_ENV || 'development') === 'production';
}

const INSECURE_JWT_SECRETS = new Set([
  'dev-secret-change-in-production',
  'change-me-in-production-use-long-random-string',
  'ci-test-jwt-secret-minimum-32-characters-long',
]);

const INSECURE_ENCRYPTION_KEYS = new Set([
  'dev-app-encryption-key-change!!',
  'ci-test-encryption-key-32chars',
]);

const INSECURE_PLATFORM_PASSWORDS = new Set([
  'platform-admin-change-me',
  'change-me',
  'admin',
  'password',
]);

const INSECURE_POSTGRES_PASSWORDS = new Set([
  'verein_secret',
  'postgres',
  'password',
  'festschmiede',
]);

/** Verhindert Produktionsstart mit Default-Secrets (K4). */
export function assertProductionSecrets(): void {
  if (!isProductionEnv()) return;

  const jwt = process.env.JWT_SECRET || '';
  if (!jwt || jwt.length < 32 || INSECURE_JWT_SECRETS.has(jwt)) {
    throw new Error(
      'JWT_SECRET muss in Produktion gesetzt sein (min. 32 Zeichen, keine Default-Werte).'
    );
  }

  const enc = process.env.APP_ENCRYPTION_KEY || '';
  if (!enc || enc.length < 32 || INSECURE_ENCRYPTION_KEYS.has(enc)) {
    throw new Error(
      'APP_ENCRYPTION_KEY muss in Produktion gesetzt sein (min. 32 Zeichen, keine Default-Werte).'
    );
  }

  const platformPassword = process.env.PLATFORM_ADMIN_PASSWORD || '';
  if (
    !platformPassword ||
    platformPassword.length < 16 ||
    INSECURE_PLATFORM_PASSWORDS.has(platformPassword)
  ) {
    throw new Error(
      'PLATFORM_ADMIN_PASSWORD muss in Produktion gesetzt sein (min. 16 Zeichen, keine Default-Werte).'
    );
  }

  const postgresPassword = process.env.POSTGRES_PASSWORD || '';
  if (
    !postgresPassword ||
    postgresPassword.length < 12 ||
    INSECURE_POSTGRES_PASSWORDS.has(postgresPassword)
  ) {
    throw new Error(
      'POSTGRES_PASSWORD muss in Produktion stark sein (min. 12 Zeichen, keine Default-Werte).'
    );
  }
}

/** Verhindert Produktionsstart mit unsicherer CORS-Konfiguration. */
export function assertProductionCors(): void {
  if (!isProductionEnv()) return;

  const errors = corsPolicy.validateProductionConfig();
  if (errors.length > 0) {
    throw new Error(`Produktions-CORS ungültig:\n- ${errors.join('\n- ')}`);
  }
}

/**
 * Gesamte Produktions-Readiness nach Bootstrap (Secrets + CORS aus Plattformsettings).
 */
export function assertProductionConfig(): void {
  assertProductionSecrets();
  assertProductionCors();
}
