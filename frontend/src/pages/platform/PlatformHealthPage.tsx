import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Chip, CircularProgress } from '@mui/material';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { platformApi } from '@/services/platformApi';

export function PlatformHealthPage() {
  const { token } = usePlatformAuth();
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!token) return;
    platformApi.getHealth(token).then(setData);
  }, [token]);

  if (!data) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Health</Typography>
      <Paper sx={{ p: 2 }}>
        <Chip label={String(data.status)} color={data.status === 'ok' ? 'success' : 'warning'} sx={{ mb: 2 }} />
        <Typography variant="body2">Zeitstempel: {String(data.timestamp)}</Typography>
        <pre style={{ marginTop: 16, fontSize: 12, overflow: 'auto' }}>
          {JSON.stringify(data.infrastructure, null, 2)}
        </pre>
      </Paper>
    </Box>
  );
}
