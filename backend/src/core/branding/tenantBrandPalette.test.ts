import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TENANT_BRAND_COLOR_ID,
  isAllowedTenantBrandColorId,
  normalizeTenantBrandColorId,
} from '../core/branding/tenantBrandPalette';

describe('tenantBrandPalette', () => {
  it('allows curated palette ids only', () => {
    expect(isAllowedTenantBrandColorId('blue-800')).toBe(true);
    expect(isAllowedTenantBrandColorId('pink-900')).toBe(true);
    expect(isAllowedTenantBrandColorId('neon')).toBe(false);
  });

  it('normalizes legacy theme ids', () => {
    expect(normalizeTenantBrandColorId('green')).toBe('green-800');
    expect(normalizeTenantBrandColorId('default')).toBe(DEFAULT_TENANT_BRAND_COLOR_ID);
  });
});
