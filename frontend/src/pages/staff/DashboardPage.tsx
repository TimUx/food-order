import { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import EuroIcon from '@mui/icons-material/Euro';
import TimerIcon from '@mui/icons-material/Timer';
import { StaffLayout } from '@/components/StaffLayout';
import { StaffKioskActions } from '@/components/StaffKioskActions';
import { useAuth } from '@/contexts/AuthContext';
import { api, formatPrice } from '@/services/api';
import { DashboardStats } from '@/types';
import { subscribeEventStats } from '@/services/realtime/channels';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
        <Box sx={{ color, fontSize: 36, flexShrink: 0, display: 'flex' }}>{icon}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" noWrap>
            {title}
          </Typography>
          <Typography
            variant="h5"
            fontWeight={800}
            sx={{ wordBreak: 'break-word', lineHeight: 1.2 }}
          >
            {value}
          </Typography>
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

  useEffect(() => {
    if (!token) return;
    api.getActiveEvent(token)
      .then((event) => setEventId(event.id))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || !eventId) return;
    return subscribeEventStats(token, eventId, setStats, 'normal');
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

  const statItems: StatCardProps[] = [
    { title: 'Bestellungen', value: stats?.totalOrders ?? 0, icon: <ReceiptIcon fontSize="inherit" />, color: 'primary.main' },
    { title: 'Offen', value: stats?.openOrders ?? 0, icon: <HourglassEmptyIcon fontSize="inherit" />, color: 'warning.main' },
    { title: 'Fertig', value: stats?.readyOrders ?? 0, icon: <CheckCircleIcon fontSize="inherit" />, color: 'success.main' },
    { title: 'Abgeholt', value: stats?.pickedUpOrders ?? 0, icon: <DoneAllIcon fontSize="inherit" />, color: 'info.main' },
    { title: 'Umsatz', value: formatPrice(stats?.revenue ?? 0), icon: <EuroIcon fontSize="inherit" />, color: 'secondary.main' },
    { title: 'Ø Bearbeitung', value: `${stats?.avgProcessingMinutes ?? 0} Min.`, icon: <TimerIcon fontSize="inherit" />, color: 'text.secondary' },
  ];

  return (
    <StaffLayout title="Dashboard">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: 2,
          mb: 4,
        }}
      >
        {statItems.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={800} gutterBottom>
          Kassenbereich
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Schnellzugriff für Bestellung vor Ort und Abholung.
        </Typography>
        <StaffKioskActions maxWidth={960} />
      </Box>
    </StaffLayout>
  );
}
