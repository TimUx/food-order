import { describe, it, expect } from 'vitest';
import { resolvePlatformColors, resolveTenantColors } from '@/utils/themeColors';
import { normalizeTenantBrandColorId, resolveTenantBrandColor } from '@/utils/tenantBrandPalette';

describe('themeColors', () => {
  it('resolves tenant brand palette presets', () => {
    expect(resolveTenantColors('green-800').primary).toBe('#2e7d32');
    expect(resolveTenantColors('unknown').primary).toBe('#1565c0');
    expect(resolveTenantColors('default').primary).toBe('#1565c0');
  });

  it('resolves platform primary color', () => {
    expect(resolvePlatformColors('#ff0000').primary).toBe('#ff0000');
    expect(resolvePlatformColors().primary).toBe('#1565c0');
  });
});

describe('tenantBrandPalette', () => {
  it('normalizes legacy theme ids', () => {
    expect(normalizeTenantBrandColorId('green')).toBe('green-800');
    expect(normalizeTenantBrandColorId('purple-900')).toBe('purple-900');
  });

  it('returns palette entry by theme id', () => {
    expect(resolveTenantBrandColor('red-800').primary).toBe('#c62828');
  });
});
