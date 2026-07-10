import { describe, it, expect } from 'vitest';
import { DEFAULT_ROUTING } from '@/types/routing';

describe('routing types', () => {
  it('provides safe localhost defaults without hardcoded production domain', () => {
    expect(DEFAULT_ROUTING.scope).toBe('tenant');
    expect(DEFAULT_ROUTING.basename).toBe('');
    expect(DEFAULT_ROUTING.baseDomain).toBe('localhost');
    expect(DEFAULT_ROUTING.domains.source).toBe('infrastructure');
    expect(DEFAULT_ROUTING.platformUrl).not.toContain('festmanager.org');
  });
});
