import { ReactNode } from 'react';
import { Alert, Box, Container, Typography } from '@mui/material';
import { useRouting } from '@/contexts/RoutingProvider';
import { usePlatform } from '@/contexts/PlatformProvider';
import { isPlatformSurfaceScope } from '@/types/routing';

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const { routing } = useRouting();
  const { platform } = usePlatform();

  const maintenance =
    routing.maintenanceMode ||
    (isPlatformSurfaceScope(routing.scope) && platform.maintenanceMode);

  if (!maintenance) return <>{children}</>;

  const message =
    routing.maintenanceMessage ||
    platform.maintenanceMessage ||
    'Die Plattform befindet sich derzeit in Wartung. Bitte versuchen Sie es später erneut.';

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Wartungsmodus
        </Typography>
        <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
          {message}
        </Alert>
      </Box>
    </Container>
  );
}
