export interface TenantBrandColor {
  id: string;
  label: string;
  primary: string;
  secondary: string;
}

/** Vorgegebene Markenfarben – alle mit ausreichend Kontrast für helle Schrift auf Buttons/Header. */
export const TENANT_BRAND_PALETTE: TenantBrandColor[] = [
  { id: 'blue-600', label: 'Blau', primary: '#1e88e5', secondary: '#42a5f5' },
  { id: 'blue-800', label: 'Dunkelblau', primary: '#1565c0', secondary: '#1976d2' },
  { id: 'blue-900', label: 'Nachtblau', primary: '#0d47a1', secondary: '#1565c0' },

  { id: 'green-600', label: 'Grün', primary: '#43a047', secondary: '#66bb6a' },
  { id: 'green-800', label: 'Dunkelgrün', primary: '#2e7d32', secondary: '#388e3c' },
  { id: 'green-900', label: 'Waldgrün', primary: '#1b5e20', secondary: '#2e7d32' },

  { id: 'red-600', label: 'Rot', primary: '#e53935', secondary: '#ef5350' },
  { id: 'red-800', label: 'Dunkelrot', primary: '#c62828', secondary: '#d32f2f' },
  { id: 'red-900', label: 'Weinrot', primary: '#b71c1c', secondary: '#c62828' },

  { id: 'orange-600', label: 'Orange', primary: '#fb8c00', secondary: '#ffa726' },
  { id: 'orange-800', label: 'Dunkelorange', primary: '#ef6c00', secondary: '#f57c00' },
  { id: 'orange-900', label: 'Kupfer', primary: '#e65100', secondary: '#ef6c00' },

  { id: 'purple-600', label: 'Lila', primary: '#8e24aa', secondary: '#ab47bc' },
  { id: 'purple-800', label: 'Dunkellila', primary: '#6a1b9a', secondary: '#7b1fa2' },
  { id: 'purple-900', label: 'Aubergine', primary: '#4a148c', secondary: '#6a1b9a' },

  { id: 'teal-600', label: 'Türkis', primary: '#00897b', secondary: '#26a69a' },
  { id: 'teal-800', label: 'Dunkeltürkis', primary: '#00695c', secondary: '#00796b' },
  { id: 'teal-900', label: 'Petrol', primary: '#004d40', secondary: '#00695c' },

  { id: 'indigo-600', label: 'Indigo', primary: '#3949ab', secondary: '#5c6bc0' },
  { id: 'indigo-800', label: 'Dunkelindigo', primary: '#283593', secondary: '#303f9f' },
  { id: 'indigo-900', label: 'Mitternacht', primary: '#1a237e', secondary: '#283593' },

  { id: 'pink-600', label: 'Pink', primary: '#d81b60', secondary: '#ec407a' },
  { id: 'pink-800', label: 'Dunkelpink', primary: '#ad1457', secondary: '#c2185b' },
  { id: 'pink-900', label: 'Beere', primary: '#880e4f', secondary: '#ad1457' },
];

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
  if (TENANT_BRAND_PALETTE.some((entry) => entry.id === themeId)) return themeId;
  return LEGACY_THEME_MAP[themeId] ?? DEFAULT_TENANT_BRAND_COLOR_ID;
}

export function resolveTenantBrandColor(themeId?: string | null): TenantBrandColor {
  const id = normalizeTenantBrandColorId(themeId);
  return TENANT_BRAND_PALETTE.find((entry) => entry.id === id) ?? TENANT_BRAND_PALETTE[1];
}

export const TENANT_BRAND_COLOR_IDS = TENANT_BRAND_PALETTE.map((entry) => entry.id);
