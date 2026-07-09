import { BrowserRouter } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { RoutingProvider, useRouting } from '@/contexts/RoutingProvider';
import { PlatformProvider } from '@/contexts/PlatformProvider';
import { TenantProvider } from '@/contexts/TenantProvider';
import { AppThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';
import { CanonicalRouteGuard } from '@/components/CanonicalRouteGuard';
import { TenantRoutes } from '@/routes/TenantRoutes';
import { WwwRoutes } from '@/routes/WwwRoutes';
import { AppRoutes } from '@/routes/AppRoutes';
import { TenantNotFoundPage } from '@/pages/errors/TenantNotFoundPage';

function AppRouter() {
  const { routing } = useRouting();

  if (routing.scope === 'unknown') {
    return <TenantNotFoundPage />;
  }

  if (routing.scope === 'www') {
    return <WwwRoutes />;
  }

  if (routing.scope === 'app') {
    return <AppRoutes />;
  }

  return <TenantRoutes />;
}

function AppBootstrap() {
  const { loading, error, routing } = useRouting();

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100dvh" gap={2}>
        <CircularProgress />
        <Typography color="text.secondary">FestManager wird geladen…</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="100dvh" px={2}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <BrowserRouter basename={routing.basename || undefined}>
      <PlatformProvider>
        <TenantProvider>
          <AppThemeProvider>
            <AuthProvider>
              <CanonicalRouteGuard>
                <ImpersonationBanner />
                <AppRouter />
              </CanonicalRouteGuard>
            </AuthProvider>
          </AppThemeProvider>
        </TenantProvider>
      </PlatformProvider>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <RoutingProvider>
      <AppBootstrap />
    </RoutingProvider>
  );
}
