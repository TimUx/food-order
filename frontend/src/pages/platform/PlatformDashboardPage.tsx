import { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box, Chip, CircularProgress } from '@mui/material';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { platformApi } from '@/services/platformApi';

export function PlatformDashboardPage() {
  const { token } = usePlatformAuth();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    platformApi.getDashboard(token)
      .then(setData)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <CircularProgress />;
  if (!data) return <Typography>Keine Daten</Typography>;

  const tenants = data.tenants as Record<string, number> | undefined;
  const system = data.system as Record<string, unknown> | undefined;
  const platform = data.platform as Record<string, unknown> | undefined;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Mandanten gesamt" value={tenants?.total ?? 0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Aktive Mandanten" value={tenants?.active ?? 0} color="success" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Deaktiviert" value={tenants?.suspended ?? 0} color="warning" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Bestellungen heute" value={(data.orders as Record<string, number>)?.today ?? 0} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Plattformstatus</Typography>
            <Chip
              label={platform?.status === 'maintenance' ? 'Wartung' : 'Betrieb'}
              color={platform?.status === 'maintenance' ? 'warning' : 'success'}
            />
            <Typography variant="body2" sx={{ mt: 1 }}>Version: {String(platform?.version ?? '–')}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>System</Typography>
            <Typography variant="body2">RAM: {(system?.memoryMb as Record<string, number>)?.rss ?? '–'} MB</Typography>
            <Typography variant="body2">Uptime: {Math.floor(Number(system?.uptimeSeconds ?? 0) / 60)} Min.</Typography>
            <Typography variant="body2">CPUs: {String(system?.cpus ?? '–')}</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color?: 'success' | 'warning' }) {
  return (
    <Paper sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary">{title}</Typography>
      <Typography variant="h4" color={color ? `${color}.main` : 'text.primary'}>{value}</Typography>
    </Paper>
  );
}
