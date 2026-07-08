import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  CircularProgress,
  Alert,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Grid,
  Button,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import { StaffLayout } from '@/components/StaffLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api, formatTime } from '@/services/api';
import { joinEvent, onOrderCreated, onOrderUpdated } from '@/services/socket';
import { Order, OrderStatus } from '@/types';
import { StatusChip } from '@/components/StatusChip';

export function KitchenPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReady, setShowReady] = useState(false);
  const [showPickedUp, setShowPickedUp] = useState(false);

  const loadOrders = () => {
    if (!token || !eventId) return;
    const statuses: OrderStatus[] = ['NEW', 'IN_PROGRESS'];
    if (showReady) statuses.push('READY');
    if (showPickedUp) statuses.push('PICKED_UP');
    api.getOrders(token, eventId, statuses.join(','))
      .then(setOrders)
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
    loadOrders();
    const unsub1 = onOrderCreated(() => loadOrders());
    const unsub2 = onOrderUpdated(() => loadOrders());
    return () => { unsub1(); unsub2(); };
  }, [eventId, token, showReady, showPickedUp]);

  const handleAction = async (order: Order) => {
    if (!token) return;
    setError('');
    try {
      if (order.status === 'NEW') {
        await api.updateOrderStatus(token, order.id, 'IN_PROGRESS');
      } else if (order.status === 'IN_PROGRESS') {
        await api.advanceOrder(token, order.id);
      }
      loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  };

  if (loading) {
    return (
      <StaffLayout title="Küche" fullWidth>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </StaffLayout>
    );
  }

  const activeCount = orders.filter((o) => ['NEW', 'IN_PROGRESS'].includes(o.status)).length;

  return (
    <StaffLayout title="Küche" fullWidth>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          {activeCount} aktive Bestellungen
        </Typography>
        <FormGroup row>
          <FormControlLabel
            control={<Checkbox checked={showReady} onChange={(e) => setShowReady(e.target.checked)} />}
            label="Fertig anzeigen"
          />
          <FormControlLabel
            control={<Checkbox checked={showPickedUp} onChange={(e) => setShowPickedUp(e.target.checked)} />}
            label="Abgeholt anzeigen"
          />
        </FormGroup>
      </Box>

      <Grid container spacing={2}>
        {orders.map((order) => (
          <Grid key={order.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Card
              sx={{
                borderLeft: 6,
                borderColor:
                  order.status === 'NEW' ? 'info.main'
                  : order.status === 'IN_PROGRESS' ? 'warning.main'
                  : order.status === 'READY' ? 'success.main'
                  : 'grey.400',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h3" fontWeight={900} color="primary">
                    #{order.displayNumber}
                  </Typography>
                  <StatusChip status={order.status} size="small" />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {formatTime(order.createdAt)}
                </Typography>
                <Stack spacing={0.5} sx={{ mb: 2 }}>
                  {order.items.map((item) => (
                    <Typography key={item.id || item.foodItemId} variant="h6" fontWeight={600}>
                      {item.quantity}× {item.name}
                    </Typography>
                  ))}
                </Stack>
                {order.status === 'NEW' && (
                  <Button
                    variant="contained"
                    color="warning"
                    size="large"
                    fullWidth
                    onClick={() => handleAction(order)}
                    sx={{ minHeight: 56 }}
                  >
                    Bearbeitung starten
                  </Button>
                )}
                {order.status === 'IN_PROGRESS' && (
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    fullWidth
                    onClick={() => handleAction(order)}
                    sx={{ minHeight: 56, fontSize: '1.2rem' }}
                  >
                    Fertig
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {orders.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            Keine Bestellungen in der Warteschlange
          </Typography>
        </Box>
      )}
    </StaffLayout>
  );
}
