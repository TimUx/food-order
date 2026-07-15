import { resolveTenantBrandColor } from '@/utils/tenantBrandPalette';

export function resolveTenantColors(theme: string): { primary: string; secondary: string } {
  const brand = resolveTenantBrandColor(theme);
  return { primary: brand.primary, secondary: brand.secondary };
}

export function resolvePlatformColors(primaryColor?: string): { primary: string; secondary: string } {
  return {
    primary: primaryColor ?? '#1565c0',
    secondary: '#00838f',
  };
}
