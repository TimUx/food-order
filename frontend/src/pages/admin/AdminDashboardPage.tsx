import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Typography, Grid, Card, CardActionArea, CardContent, Box, Alert, CircularProgress,
  Chip, Paper, Stack, Button, Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { AdminLayout } from '@/components/AdminLayout';
import { RealtimeStatusPanel } from '@/components/RealtimeStatusPanel';
import { useAdminUi } from '@/contexts/AdminUiContext';
import { resolveAdminIcon } from '@/admin/iconMap';
import { renderWidget } from '@/admin/widgetRegistry';
import { canAccessPermission } from '@/utils/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

const healthIcons = {
  healthy: <CheckCircleIcon fontSize="small" color="success" />,
  degraded: <WarningIcon fontSize="small" color="warning" />,
  unhealthy: <ErrorIcon fontSize="small" color="error" />,
  unknown: <HelpOutlineIcon fontSize="small" color="disabled" />,
};

export function AdminDashboardPage() {
  const { user, token } = useAuth();
  const { catalog, loading, error } = useAdminUi();
  const [hasEvents, setHasEvents] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.getEvents(token)
      .then((events) => setHasEvents(events.length > 0))
      .catch(() => setHasEvents(true));
  }, [token]);

  const tiles = (catalog?.dashboardTiles ?? []).filter((tile) => {
    const page = catalog?.pages.find((p) => p.path === tile.path);
    return canAccessPermission(user, page?.requiredPermission);
  });

  const widgets = catalog?.widgets ?? [];
  const health = catalog?.technicalDetails?.health ?? [];

  return (
    <AdminLayout title="Administration">
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Administration
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Veranstalter, Team und Funktionen verwalten.
      </Typography>

      {!loading && !hasEvents && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            <Button component={Link} to="/admin/einrichtung" color="inherit" size="small">
              Einrichtungsassistent starten
            </Button>
          }
        >
          Noch keine Veranstaltung angelegt? Der Assistent führt Sie in wenigen Schritten durch die Ersteinrichtung.
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {widgets.length > 0 && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {widgets.map((widget) => (
                <Grid key={widget.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  {renderWidget(widget.componentId, widget.title)}
                </Grid>
              ))}
            </Grid>
          )}

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {tiles.map((tile) => (
              <Grid key={tile.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card>
                  <CardActionArea component={Link} to={tile.path} sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ mb: 1 }}>{resolveAdminIcon(tile.icon)}</Box>
                      <Typography variant="h6" fontWeight={700}>{tile.label}</Typography>
                      {tile.description && (
                        <Typography variant="body2" color="text.secondary">{tile.description}</Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" fontWeight={600}>Erweitert</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <RealtimeStatusPanel />
                {health.length > 0 && (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>Funktionsstatus</Typography>
                    <Stack spacing={1}>
                      {health.map((item) => (
                        <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          {healthIcons[item.status]}
                          <Typography variant="body2" fontWeight={600}>{item.label}</Typography>
                          <Chip
                            size="small"
                            label={
                              item.status === 'healthy' ? 'In Ordnung'
                                : item.status === 'degraded' ? 'Prüfen'
                                  : item.status === 'unhealthy' ? 'Fehler'
                                    : 'Unbekannt'
                            }
                            variant="outlined"
                          />
                          {item.description && (
                            <Typography variant="caption" color="text.secondary">{item.description}</Typography>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </>
      )}
    </AdminLayout>
  );
}
