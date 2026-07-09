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
import { subscribeEventOrders } from '@/services/realtime/channels';
import { Order, OrderStatus } from '@/types';

export function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
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
    return subscribeEventOrders(token, eventId, '', setOrders, 'normal');
  }, [eventId, token]);

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    if (!token) return;
    try {
      await api.updateOrderStatus(token, orderId, status);
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
    <StaffLayout title="Bestellungen">
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <Stack spacing={2}>
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            showActions
            onStatusChange={(status) => void handleStatusChange(order.id, status)}
          />
        ))}
      </Stack>
      {orders.length === 0 && (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          Keine Bestellungen
        </Typography>
      )}
    </StaffLayout>
  );
}
