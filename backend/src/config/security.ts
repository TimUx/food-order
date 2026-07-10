import { config } from './index';

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

/** Verhindert Produktionsstart mit Default-Secrets (K4). */
export function assertProductionSecrets(): void {
  if (config.nodeEnv !== 'production') return;

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
}
