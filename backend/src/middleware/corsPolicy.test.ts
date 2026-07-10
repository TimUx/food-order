import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { corsPolicy } from '../middleware/corsPolicy';
import { DEFAULT_PLATFORM_CONTEXT } from '../platform/tenant/types';

describe('corsPolicy', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    corsPolicy.bindFromPlatform(
      { ...DEFAULT_PLATFORM_CONTEXT, baseDomain: 'example.test' },
      {
        corsOrigins: ['https://example.test'],
        allowWildcardSubdomains: true,
      }
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows explicit origins from platform settings', () => {
    expect(corsPolicy.isAllowed('https://example.test')).toBe(true);
  });

  it('allows tenant subdomains when wildcard enabled', () => {
    expect(corsPolicy.isAllowed('https://asv-libelle.example.test')).toBe(true);
  });

  it('allows localhost in development', () => {
    expect(corsPolicy.isAllowed('http://localhost:5173')).toBe(true);
  });

  it('rejects unknown origins', () => {
    expect(corsPolicy.isAllowed('https://evil.example.com')).toBe(false);
  });

  describe('production', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
      corsPolicy.bindFromPlatform(
        { ...DEFAULT_PLATFORM_CONTEXT, baseDomain: 'festschmiede.de' },
        {
          corsOrigins: ['https://app.festschmiede.de'],
          allowWildcardSubdomains: true,
        }
      );
    });

    it('rejects CORS wildcard in production', () => {
      corsPolicy.bindFromPlatform(
        { ...DEFAULT_PLATFORM_CONTEXT, baseDomain: 'festschmiede.de' },
        { corsOrigins: ['*'], allowWildcardSubdomains: false }
      );
      expect(corsPolicy.isAllowed('https://evil.example.com')).toBe(false);
      expect(corsPolicy.validateProductionConfig().join(' ')).toMatch(/Wildcard/);
    });

    it('rejects localhost in production unless explicitly listed', () => {
      expect(corsPolicy.isAllowed('http://localhost:5173')).toBe(false);
    });

    it('passes validation with https origin and wildcard subdomains', () => {
      expect(corsPolicy.validateProductionConfig()).toEqual([]);
    });

    it('fails validation when wildcard subdomains without https origins', () => {
      corsPolicy.bindFromPlatform(
        { ...DEFAULT_PLATFORM_CONTEXT, baseDomain: 'festschmiede.de' },
        {
          corsOrigins: ['http://localhost:5173'],
          allowWildcardSubdomains: true,
        }
      );
      const errors = corsPolicy.validateProductionConfig();
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
