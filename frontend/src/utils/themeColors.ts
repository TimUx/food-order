const TENANT_THEME_COLORS: Record<string, { primary: string; secondary: string }> = {
  default: { primary: '#1976d2', secondary: '#f57c00' },
  blue: { primary: '#1565c0', secondary: '#00838f' },
  green: { primary: '#2e7d32', secondary: '#558b2f' },
  orange: { primary: '#e65100', secondary: '#f57c00' },
  purple: { primary: '#6a1b9a', secondary: '#8e24aa' },
};

export function resolveTenantColors(theme: string): { primary: string; secondary: string } {
  return TENANT_THEME_COLORS[theme] ?? TENANT_THEME_COLORS.default;
}

export function resolvePlatformColors(primaryColor?: string): { primary: string; secondary: string } {
  return {
    primary: primaryColor ?? '#1565c0',
    secondary: '#00838f',
  };
}
