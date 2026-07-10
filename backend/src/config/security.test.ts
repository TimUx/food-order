import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { assertProductionCors, assertProductionSecrets } from './security';
import { corsPolicy } from '../middleware/corsPolicy';
import { DEFAULT_PLATFORM_CONTEXT } from '../platform/tenant/types';

describe('assertProductionConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('assertProductionSecrets', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
      vi.stubEnv('APP_ENCRYPTION_KEY', 'y'.repeat(32));
      vi.stubEnv('PLATFORM_ADMIN_PASSWORD', 'strong-platform-pass');
      vi.stubEnv('POSTGRES_PASSWORD', 'strong-db-pass-123');
    });

    it('throws on default JWT secret', () => {
      vi.stubEnv('JWT_SECRET', 'dev-secret-change-in-production');
      expect(() => assertProductionSecrets()).toThrow(/JWT_SECRET/);
    });

    it('throws on weak postgres password', () => {
      vi.stubEnv('POSTGRES_PASSWORD', 'verein_secret');
      expect(() => assertProductionSecrets()).toThrow(/POSTGRES_PASSWORD/);
    });

    it('passes with strong secrets', () => {
      expect(() => assertProductionSecrets()).not.toThrow();
    });
  });

  describe('assertProductionCors', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
    });

    it('throws when only localhost origins configured', () => {
      corsPolicy.bindFromPlatform(
        { ...DEFAULT_PLATFORM_CONTEXT, baseDomain: 'festschmiede.de' },
        {
          corsOrigins: ['http://localhost:5173'],
          allowWildcardSubdomains: false,
        }
      );
      expect(() => assertProductionCors()).toThrow(/Produktions-CORS/);
    });

    it('passes with explicit https origin', () => {
      corsPolicy.bindFromPlatform(
        { ...DEFAULT_PLATFORM_CONTEXT, baseDomain: 'festschmiede.de' },
        {
          corsOrigins: ['https://app.festschmiede.de'],
          allowWildcardSubdomains: true,
        }
      );
      expect(() => assertProductionCors()).not.toThrow();
    });
  });
});
