import { createContext, useContext, useState, useMemo, useCallback, ReactNode, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, PaletteMode } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { useRouting } from '@/contexts/RoutingProvider';
import { useTenant } from '@/contexts/TenantProvider';
import { usePlatform } from '@/contexts/PlatformProvider';
import { scopedStorageKey } from '@/utils/storageScope';
import { isPlatformSurfaceScope } from '@/types/routing';
import { resolvePlatformColors, resolveTenantColors } from '@/utils/themeColors';

interface ThemeContextType {
  mode: PaletteMode;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { routing } = useRouting();
  const { tenant } = useTenant();
  const { platform } = usePlatform();

  const themeStorageKey = scopedStorageKey('verein_theme', routing.scope, routing.tenantSlug);

  const [mode, setMode] = useState<PaletteMode>(() => {
    const stored = localStorage.getItem(themeStorageKey);
    return (stored as PaletteMode) || 'light';
  });

  useEffect(() => {
    const stored = localStorage.getItem(themeStorageKey);
    if (stored === 'light' || stored === 'dark') {
      setMode(stored);
    }
  }, [themeStorageKey]);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(themeStorageKey, next);
      return next;
    });
  }, [themeStorageKey]);

  const colors = useMemo(() => {
    if (isPlatformSurfaceScope(routing.scope)) {
      return resolvePlatformColors(platform.primaryColor);
    }
    return resolveTenantColors(tenant.theme);
  }, [routing.scope, tenant.theme, platform.primaryColor]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: mode === 'light' ? colors.primary : colors.primary },
          secondary: { main: mode === 'light' ? colors.secondary : colors.secondary },
          success: { main: '#2e7d32' },
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          h1: { fontWeight: 700 },
          h2: { fontWeight: 700 },
          h3: { fontWeight: 600 },
        },
        shape: { borderRadius: 12 },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 600,
                minHeight: 44,
              },
              sizeLarge: {
                minHeight: 56,
                fontSize: '1.1rem',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                boxShadow: mode === 'light'
                  ? '0 2px 12px rgba(0,0,0,0.08)'
                  : '0 2px 12px rgba(0,0,0,0.3)',
              },
            },
          },
        },
      }),
    [mode, colors]
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

/** @deprecated Use AppThemeProvider – alias für Abwärtskompatibilität */
export const ThemeProvider = AppThemeProvider;

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode muss innerhalb von AppThemeProvider verwendet werden');
  return ctx;
}
