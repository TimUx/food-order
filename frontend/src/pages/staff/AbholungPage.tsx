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
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { StaffLayout } from '@/components/StaffLayout';
import { StaffKioskActions } from '@/components/StaffKioskActions';
import { Numpad } from '@/components/Numpad';
import { StatusChip } from '@/components/StatusChip';
import { useAuth } from '@/contexts/AuthContext';
import { api, formatPrice } from '@/services/api';
import { Order } from '@/types';
import { touchFieldSx, touchPrimaryButtonSx, touchIconButtonSx } from '@/theme/touch';

export function AbholungPage() {
  const { token } = useAuth();
  const [orderNumber, setOrderNumber] = useState('');
  const [lastName, setLastName] = useState('');
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
      const result = await api.lookupOrderByNumber(
        token,
        parseInt(orderNumber, 10),
        lastName.trim() || undefined
      );
      setOrder(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bestellung nicht gefunden');
    } finally {
      setLoading(false);
    }
  };

  const resetForNext = () => {
    setOrderNumber('');
    setLastName('');
    setOrder(null);
    setError('');
  };

  const handleConfirmPickup = async () => {
    if (!token || !order) return;
    setConfirming(true);
    try {
      const updated = await api.updateOrderStatus(token, order.id, 'PICKED_UP');
      setOrder(updated);
      setTimeout(resetForNext, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei Abholung');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <StaffLayout title="Abholung" fullWidth>
      <Typography variant="h4" fontWeight={800} gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2rem' } }}>
        Abholung bestätigen
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, fontSize: '1.1rem' }}>
        Abholnummer eingeben und Abholung bestätigen.
      </Typography>

      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, maxWidth: 560 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="stretch">
            <TextField
              label="Abholnummer"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="z.B. 042"
              fullWidth
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              sx={touchFieldSx}
              inputProps={{ style: { fontSize: '1.75rem', textAlign: 'center', fontWeight: 700 }, inputMode: 'numeric' }}
            />
            <Button
              variant="contained"
              onClick={() => void handleLookup()}
              disabled={loading || !orderNumber}
              aria-label="Suchen"
              sx={{ ...touchIconButtonSx, minWidth: 72, minHeight: 72, width: 72, height: 72, flexShrink: 0 }}
            >
              <SearchIcon sx={{ fontSize: 32 }} />
            </Button>
          </Stack>
          <TextField
            label="Nachname (optional bei Vor-Ort-Bestellungen)"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            fullWidth
            sx={touchFieldSx}
            onKeyDown={(e) => e.key === 'Enter' && void handleLookup()}
            helperText="Bei Online-Bestellungen zur Verifikation erforderlich"
          />
          <Numpad value={orderNumber} onChange={setOrderNumber} />
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2, fontSize: '1.05rem' }}>{error}</Alert>}

      {order && (
        <Paper sx={{ p: { xs: 3, sm: 4 }, maxWidth: 640 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="overline" sx={{ fontSize: '1rem' }}>Abholnummer</Typography>
            <Typography variant="h1" fontWeight={900} color="primary" sx={{ fontSize: { xs: '4.5rem', sm: '6rem' }, lineHeight: 1.1 }}>
              {order.displayNumber}
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              <StatusChip status={order.status} />
              {order.paymentLabel && (
                <Chip size="small" label={order.paymentLabel} variant="outlined" />
              )}
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={1.5} sx={{ mb: 3 }}>
            {order.items.map((item) => (
              <Box key={item.id || item.foodItemId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                <Typography variant="h5" fontWeight={600}>{item.quantity}× {item.name}</Typography>
                <Typography variant="h6">{formatPrice(item.lineTotal || 0)}</Typography>
              </Box>
            ))}
          </Stack>

          <Typography variant="h4" fontWeight={800} textAlign="right" sx={{ mb: 3 }}>
            Gesamt: {formatPrice(order.totalPrice)}
          </Typography>

          {order.status === 'READY' && (
            <Button
              variant="contained"
              color="success"
              fullWidth
              onClick={handleConfirmPickup}
              disabled={confirming}
              sx={{
                ...touchPrimaryButtonSx,
                minHeight: 80,
                fontSize: '1.35rem',
                flexDirection: 'column',
                gap: 1,
                py: 2,
              }}
            >
              <DoneAllIcon sx={{ fontSize: 40 }} />
              Abholung bestätigen
            </Button>
          )}

          {order.status === 'PICKED_UP' && (
            <Alert severity="success" sx={{ fontSize: '1.1rem', mb: 2 }}>
              Abholung bestätigt – Formular wird zurückgesetzt…
            </Alert>
          )}

          {order.status !== 'READY' && order.status !== 'PICKED_UP' && (
            <Alert severity="info" sx={{ fontSize: '1.05rem' }}>
              Bestellung ist noch nicht fertig (Status: {order.statusLabel})
            </Alert>
          )}
        </Paper>
      )}

      <Box sx={{ mt: 4 }}>
        <StaffKioskActions />
      </Box>
    </StaffLayout>
  );
}
