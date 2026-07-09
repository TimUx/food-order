import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, CircularProgress } from '@mui/material';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { platformApi } from '@/services/platformApi';

export function PlatformMonitoringPage() {
  const { token } = usePlatformAuth();
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!token) return;
    platformApi.getMonitoring(token).then(setData);
  }, [token]);

  if (!data) return <CircularProgress />;

  const cpu = data.cpu as Record<string, unknown>;
  const memory = data.memory as Record<string, unknown>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Monitoring</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}><MetricPaper title="CPU Kerne" value={String(cpu?.cores ?? '–')} /></Grid>
        <Grid item xs={12} md={4}><MetricPaper title="RAM gesamt (MB)" value={String(memory?.totalMb ?? '–')} /></Grid>
        <Grid item xs={12} md={4}><MetricPaper title="RAM frei (MB)" value={String(memory?.freeMb ?? '–')} /></Grid>
        <Grid item xs={12} md={4}><MetricPaper title="Uploads (MB)" value={String((data.storage as Record<string, unknown>)?.uploadsMb ?? '–')} /></Grid>
        <Grid item xs={12} md={4}><MetricPaper title="DB verbunden" value={(data.database as Record<string, unknown>)?.connected ? 'Ja' : 'Nein'} /></Grid>
        <Grid item xs={12} md={4}><MetricPaper title="Docker" value={(data.docker as Record<string, unknown>)?.detected ? 'Ja' : 'Nein'} /></Grid>
      </Grid>
    </Box>
  );
}

function MetricPaper({ title, value }: { title: string; value: string }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">{title}</Typography>
      <Typography variant="h5">{value}</Typography>
    </Paper>
  );
}
