import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Grid, Chip, CircularProgress, Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { platformApi, type PlatformTenant } from '@/services/platformApi';

export function PlatformTenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = usePlatformAuth();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<PlatformTenant | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!token || !id) return;
    platformApi.getTenant(token, id).then(setTenant).finally(() => setLoading(false));
  };

  useEffect(load, [token, id]);

  if (loading) return <CircularProgress />;
  if (!tenant) return <Typography>Mandant nicht gefunden</Typography>;

  const actions = [
    { label: 'Aktivieren', fn: () => platformApi.activateTenant(token!, id!), show: tenant.status !== 'ACTIVE' },
    { label: 'Sperren', fn: () => platformApi.suspendTenant(token!, id!), show: tenant.status === 'ACTIVE' },
    { label: 'Archivieren', fn: () => platformApi.archiveTenant(token!, id!), show: tenant.status !== 'ARCHIVED' },
    { label: 'Exportieren', fn: async () => {
      const data = await platformApi.exportTenant(token!, id!);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tenant-${tenant.slug}-export.json`;
      a.click();
    }, show: true },
  ];

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/platform/mandanten')} sx={{ mb: 2 }}>
        Zurück
      </Button>
      <Typography variant="h4" gutterBottom>{tenant.name}</Typography>
      <Chip label={tenant.status} sx={{ mb: 2 }} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Allgemein</Typography>
            <InfoRow label="Slug" value={tenant.slug} />
            <InfoRow label="Subdomain" value={tenant.subdomain} />
            <InfoRow label="E-Mail" value={tenant.email ?? '–'} />
            <InfoRow label="Telefon" value={tenant.phone ?? '–'} />
            <InfoRow label="Website" value={tenant.website ?? '–'} />
            <InfoRow label="Sprache" value={tenant.locale} />
            <InfoRow label="Zeitzone" value={tenant.timezone} />
            <InfoRow label="Währung" value={tenant.currency} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Statistik</Typography>
            <InfoRow label="Aktive Benutzer" value={String(tenant.stats?.activeUsers ?? 0)} />
            <InfoRow label="Veranstaltungen" value={String(tenant.stats?.events ?? 0)} />
            <InfoRow label="Aktive Events" value={String(tenant.stats?.activeEvents ?? 0)} />
            <InfoRow label="Module aktiv" value={String(tenant.stats?.modules ?? 0)} />
            <InfoRow label="Bestellungen" value={String(tenant.stats?.ordersTotal ?? 0)} />
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />
      <Box display="flex" gap={1} flexWrap="wrap">
        {actions.filter((a) => a.show).map((a) => (
          <Button key={a.label} variant="outlined" onClick={async () => { await a.fn(); load(); }}>
            {a.label}
          </Button>
        ))}
        <Button color="error" variant="outlined" onClick={async () => {
          if (confirm('Mandant unwiderruflich löschen?')) {
            await platformApi.deleteTenant(token!, id!);
            navigate('/platform/mandanten');
          }
        }}>
          Löschen
        </Button>
      </Box>
    </Box>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box display="flex" justifyContent="space-between" py={0.5}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}
