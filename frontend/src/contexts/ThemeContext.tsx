import { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, PaletteMode } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';

interface ThemeContextType {
  mode: PaletteMode;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = 'verein_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as PaletteMode) || 'light';
  });

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: mode === 'light' ? '#1976d2' : '#90caf9' },
          secondary: { main: mode === 'light' ? '#f57c00' : '#ffb74d' },
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
    [mode]
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

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode muss innerhalb von ThemeProvider verwendet werden');
  return ctx;
}
