import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

export function SetupGate({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [completed, setCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) return;
    api.getSetupStatus(token)
      .then((s) => setCompleted(s.completed))
      .catch(() => setCompleted(true));
  }, [token]);

  if (completed === null) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!completed) {
    return <Navigate to="/admin/einrichtung" replace />;
  }

  return <>{children}</>;
}
