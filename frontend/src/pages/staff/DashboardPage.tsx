import { useState, useEffect } from 'react';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import EuroIcon from '@mui/icons-material/Euro';
import TimerIcon from '@mui/icons-material/Timer';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { StaffLayout } from '@/components/StaffLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api, formatPrice } from '@/services/api';
import { DashboardStats } from '@/types';
import { joinEvent, onOrderCreated, onOrderUpdated } from '@/services/socket';

function StatCard({ title, value, icon, color }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ color, fontSize: 40 }}>{icon}</Box>
          <Box>
            <Typography variant="body2" color="text.secondary">{title}</Typography>
            <Typography variant="h4" fontWeight={800}>{value}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = () => {
    if (!token || !eventId) return;
    api.getStats(token, eventId)
      .then(setStats)
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    if (!token) return;
    api.getActiveEvent(token)
      .then((event) => {
        setEventId(event.id);
        joinEvent(event.id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!eventId) return;
    loadStats();
    const unsub1 = onOrderCreated(() => loadStats());
    const unsub2 = onOrderUpdated(() => loadStats());
    const interval = setInterval(loadStats, 30000);
    return () => {
      unsub1();
      unsub2();
      clearInterval(interval);
    };
  }, [eventId, token]);

  if (loading) {
    return (
      <StaffLayout title="Dashboard">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout title="Dashboard">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard title="Bestellungen" value={stats?.totalOrders ?? 0} icon={<ReceiptIcon fontSize="inherit" />} color="primary.main" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard title="Offen" value={stats?.openOrders ?? 0} icon={<HourglassEmptyIcon fontSize="inherit" />} color="warning.main" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard title="Fertig" value={stats?.readyOrders ?? 0} icon={<CheckCircleIcon fontSize="inherit" />} color="success.main" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard title="Abgeholt" value={stats?.pickedUpOrders ?? 0} icon={<DoneAllIcon fontSize="inherit" />} color="info.main" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard title="Umsatz" value={formatPrice(stats?.revenue ?? 0)} icon={<EuroIcon fontSize="inherit" />} color="secondary.main" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard title="Ø Bearbeitung" value={`${stats?.avgProcessingMinutes ?? 0} Min.`} icon={<TimerIcon fontSize="inherit" />} color="text.secondary" />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TrendingUpIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>Beliebteste Gerichte</Typography>
          </Box>
          {stats?.popularDishes.length === 0 ? (
            <Typography color="text.secondary">Noch keine Daten</Typography>
          ) : (
            <List dense>
              {stats?.popularDishes.map((dish, i) => (
                <ListItem key={dish.name}>
                  <ListItemText
                    primary={`${i + 1}. ${dish.name}`}
                    secondary={`${dish.count}× bestellt`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </StaffLayout>
  );
}
