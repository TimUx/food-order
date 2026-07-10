import { describe, it, expect } from 'vitest';
import { scopedStorageKey } from '@/utils/storageScope';

describe('storageScope', () => {
  it('scopes tenant keys by slug', () => {
    expect(scopedStorageKey('verein_token', 'tenant', 'asv-libelle')).toBe(
      'verein_token:asv-libelle'
    );
  });

  it('uses base key for app scope', () => {
    expect(scopedStorageKey('fm_platform_token', 'app', null)).toBe('fm_platform_token');
  });

  it('uses base key for tenant without slug', () => {
    expect(scopedStorageKey('verein_token', 'tenant', null)).toBe('verein_token');
  });
});
