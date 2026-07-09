import { Navigate, Outlet } from 'react-router-dom';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { PlatformLayout } from '@/components/PlatformLayout';
import { CircularProgress, Box } from '@mui/material';

export function PlatformShell() {
  const { user, loading } = usePlatformAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/platform/login" replace />;
  }

  return (
    <PlatformLayout>
      <Outlet />
    </PlatformLayout>
  );
}
