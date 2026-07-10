import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { platformApi } from '@/services/platformApi';

export function PlatformBackupsPage() {
  const { token } = usePlatformAuth();
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!token) return;
    platformApi.getBackups(token).then(setData);
  }, [token]);

  if (!data) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Backups</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>{String(data.note)}</Alert>
      <Paper sx={{ p: 2 }}>
        <Typography variant="body1">Strategien: {(data.strategies as string[])?.join(', ')}</Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>Letztes Vollbackup: {data.lastFullBackup ? String(data.lastFullBackup) : 'Noch keines'}</Typography>
        <Typography variant="body2">Restore verfügbar: {data.restoreAvailable ? 'Ja' : 'Nein (Phase 4+)'}</Typography>
      </Paper>
    </Box>
  );
}
