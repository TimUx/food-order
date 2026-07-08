import { useState } from 'react';
import {
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  Alert,
  Stack,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { StaffLayout } from '@/components/StaffLayout';
import { StatusChip } from '@/components/StatusChip';
import { useAuth } from '@/contexts/AuthContext';
import { api, formatPrice } from '@/services/api';
import { Order } from '@/types';

export function CashierPage() {
  const { token } = useAuth();
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleLookup = async () => {
    if (!token || !orderNumber) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const result = await api.lookupOrderByNumber(token, parseInt(orderNumber, 10));
      setOrder(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bestellung nicht gefunden');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPickup = async () => {
    if (!token || !order) return;
    setConfirming(true);
    try {
      const updated = await api.updateOrderStatus(token, order.id, 'PICKED_UP');
      setOrder(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei Abholung');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <StaffLayout title="Kasse">
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Abholung bestätigen
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 500, mb: 3 }}>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Abholnummer"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="z.B. 042"
            fullWidth
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            inputProps={{ style: { fontSize: '1.5rem', textAlign: 'center' } }}
          />
          <Button
            variant="contained"
            size="large"
            onClick={handleLookup}
            disabled={loading || !orderNumber}
            sx={{ minWidth: 120, minHeight: 56 }}
          >
            <SearchIcon />
          </Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {order && (
        <Paper sx={{ p: 4, maxWidth: 600 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="overline">Abholnummer</Typography>
            <Typography variant="h1" fontWeight={900} color="primary" sx={{ fontSize: '5rem' }}>
              {order.displayNumber}
            </Typography>
            <StatusChip status={order.status} />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={1} sx={{ mb: 2 }}>
            {order.items.map((item) => (
              <Box key={item.id || item.foodItemId} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">{item.quantity}× {item.name}</Typography>
                <Typography>{formatPrice(item.lineTotal || 0)}</Typography>
              </Box>
            ))}
          </Stack>

          <Typography variant="h5" fontWeight={700} textAlign="right" sx={{ mb: 3 }}>
            Gesamt: {formatPrice(order.totalPrice)}
          </Typography>

          {order.status === 'READY' && (
            <Button
              variant="contained"
              color="success"
              size="large"
              fullWidth
              startIcon={<DoneAllIcon />}
              onClick={handleConfirmPickup}
              disabled={confirming}
              sx={{ minHeight: 64, fontSize: '1.2rem' }}
            >
              Abholung bestätigen
            </Button>
          )}

          {order.status === 'PICKED_UP' && (
            <Alert severity="success">Bereits abgeholt</Alert>
          )}

          {order.status !== 'READY' && order.status !== 'PICKED_UP' && (
            <Alert severity="info">
              Bestellung ist noch nicht fertig (Status: {order.statusLabel})
            </Alert>
          )}
        </Paper>
      )}
    </StaffLayout>
  );
}
