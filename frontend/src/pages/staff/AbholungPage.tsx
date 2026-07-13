import { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
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
import { resolvePreferredEventId } from '@/utils/eventSelection';
import { touchFieldSx, touchPrimaryButtonSx, touchIconButtonSx } from '@/theme/touch';

export function AbholungPage() {
  const { token } = useAuth();
  const [pickupEvents, setPickupEvents] = useState<import('@/types').PublicEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventsLoading, setEventsLoading] = useState(true);
  const [orderNumber, setOrderNumber] = useState('');
  const [lastName, setLastName] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.getPickupEvents(token)
      .then((events) => {
        setPickupEvents(events);
        setSelectedEventId(resolvePreferredEventId(events));
      })
      .catch((err) => setError(err.message))
      .finally(() => setEventsLoading(false));
  }, [token]);

  const handleLookup = async () => {
    if (!token || !selectedEventId || !orderNumber) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const result = await api.lookupOrderByNumber(
        token,
        selectedEventId,
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

  if (eventsLoading) {
    return (
      <StaffLayout title="Abholung" fullWidth>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout title="Abholung" fullWidth>
      <Typography variant="h4" fontWeight={800} gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2rem' } }}>
        Abholung bestätigen
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2, fontSize: '1.1rem' }}>
        Veranstaltung wählen, Abholnummer eingeben und Abholung bestätigen.
      </Typography>

      {pickupEvents.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Derzeit sind keine Veranstaltungen für Abholungen verfügbar.
        </Alert>
      ) : (
        <FormControl fullWidth sx={{ mb: 3, maxWidth: 560, ...touchFieldSx }}>
          <InputLabel id="pickup-event-label">Veranstaltung</InputLabel>
          <Select
            labelId="pickup-event-label"
            label="Veranstaltung"
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setOrder(null);
              setError('');
            }}
            displayEmpty
          >
            <MenuItem value="">
              <em>Veranstaltung wählen</em>
            </MenuItem>
            {pickupEvents.map((event) => (
              <MenuItem key={event.id} value={event.id}>
                {event.name} · {event.eventDateLabel}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {!selectedEventId && pickupEvents.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Bitte wählen Sie zuerst eine Veranstaltung aus.
        </Alert>
      )}

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
              disabled={!selectedEventId}
              onKeyDown={(e) => e.key === 'Enter' && void handleLookup()}
              sx={touchFieldSx}
              inputProps={{ style: { fontSize: '1.75rem', textAlign: 'center', fontWeight: 700 }, inputMode: 'numeric' }}
            />
            <Button
              variant="contained"
              onClick={() => void handleLookup()}
              disabled={loading || !selectedEventId || !orderNumber}
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
            disabled={!selectedEventId}
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
