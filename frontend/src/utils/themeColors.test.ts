import { describe, it, expect } from 'vitest';
import { resolvePlatformColors, resolveTenantColors } from '@/utils/themeColors';

describe('themeColors', () => {
  it('resolves tenant theme presets', () => {
    expect(resolveTenantColors('green').primary).toBe('#2e7d32');
    expect(resolveTenantColors('unknown').primary).toBe('#1976d2');
  });

  it('resolves platform primary color', () => {
    expect(resolvePlatformColors('#ff0000').primary).toBe('#ff0000');
    expect(resolvePlatformColors().primary).toBe('#1565c0');
  });
});
