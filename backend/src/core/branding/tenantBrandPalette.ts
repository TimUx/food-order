export const TENANT_BRAND_COLOR_IDS = [
  'blue-600', 'blue-800', 'blue-900',
  'green-600', 'green-800', 'green-900',
  'red-600', 'red-800', 'red-900',
  'orange-600', 'orange-800', 'orange-900',
  'purple-600', 'purple-800', 'purple-900',
  'teal-600', 'teal-800', 'teal-900',
  'indigo-600', 'indigo-800', 'indigo-900',
  'pink-600', 'pink-800', 'pink-900',
] as const;

export const DEFAULT_TENANT_BRAND_COLOR_ID = 'blue-800';

const LEGACY_THEME_MAP: Record<string, string> = {
  default: DEFAULT_TENANT_BRAND_COLOR_ID,
  blue: 'blue-800',
  green: 'green-800',
  orange: 'orange-800',
  purple: 'purple-800',
};

export function normalizeTenantBrandColorId(themeId?: string | null): string {
  if (!themeId) return DEFAULT_TENANT_BRAND_COLOR_ID;
  if ((TENANT_BRAND_COLOR_IDS as readonly string[]).includes(themeId)) return themeId;
  return LEGACY_THEME_MAP[themeId] ?? DEFAULT_TENANT_BRAND_COLOR_ID;
}

export function isAllowedTenantBrandColorId(themeId: string): boolean {
  return (TENANT_BRAND_COLOR_IDS as readonly string[]).includes(themeId);
}
