import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import { StaffLayout } from '@/components/StaffLayout';
import { OrderCard } from '@/components/OrderCard';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { joinEvent, onOrderCreated, onOrderUpdated } from '@/services/socket';
import { Order, OrderStatus } from '@/types';

export function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = () => {
    if (!token || !eventId) return;
    api.getOrders(token, eventId)
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
  }, [eventId, token]);

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    if (!token) return;
    try {
      await api.updateOrderStatus(token, orderId, status);
      loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  };

  if (loading) {
    return (
      <StaffLayout title="Bestellungen">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout title="Bestellungen" fullWidth>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {orders.length} Bestellungen · Sortiert nach Eingang
      </Typography>
      <Stack spacing={2}>
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            showActions
            onStatusChange={(status) => handleStatusChange(order.id, status)}
          />
        ))}
      </Stack>
      {orders.length === 0 && (
        <Typography color="text.secondary" textAlign="center" sx={{ py: 8 }}>
          Noch keine Bestellungen
        </Typography>
      )}
    </StaffLayout>
  );
}
