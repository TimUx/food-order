import { useState, useEffect, useRef } from 'react';
import {
  Typography,
  Box,
  Paper,
  Alert,
  CircularProgress,
  TextField,
  Button,
  Stack,
  keyframes,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useParams, useLocation, Link } from 'react-router-dom';
import { PublicLayout } from '@/components/PublicLayout';
import { StatusChip } from '@/components/StatusChip';
import { api, formatPrice } from '@/services/api';
import { subscribeOrderStatus } from '@/services/realtime/channels';
import { Order } from '@/types';
import { resolveDefaultEventId } from '@/utils/eventSelection';

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

export function OrderStatusPage() {
  const { lookupToken } = useParams<{ lookupToken: string }>();
  const location = useLocation();
  const [order, setOrder] = useState<Order | null>((location.state as { order?: Order })?.order || null);
  const [lookupMode, setLookupMode] = useState(!lookupToken);
  const [verifyMode, setVerifyMode] = useState(Boolean(lookupToken && !(location.state as { order?: Order })?.order));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [lastName, setLastName] = useState(
    (location.state as { order?: Order })?.order?.customer?.lastName ?? ''
  );
  const [showReadyAlert, setShowReadyAlert] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelLastName, setCancelLastName] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [lookupEvents, setLookupEvents] = useState<import('@/types').PublicEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventsLoading, setEventsLoading] = useState(true);
  const prevStatus = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    api.getPublicPickupEvents()
      .then((events) => {
        setLookupEvents(events);
        setSelectedEventId(resolveDefaultEventId(events) ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Veranstaltungen konnten nicht geladen werden'))
      .finally(() => setEventsLoading(false));
  }, []);

  useEffect(() => {
    if (!lookupToken || order || verifyMode) return;
    if (!lastName.trim()) {
      setVerifyMode(true);
      setLoading(false);
      return;
    }
    api.getOrderByToken(lookupToken, lastName.trim())
      .then(setOrder)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [lookupToken, order, verifyMode, lastName]);

  useEffect(() => {
    if (!order?.lookupToken) return;
    return subscribeOrderStatus(
      order.lookupToken,
      order.customer?.lastName,
      (updated) => {
        if (updated.id === order.id) setOrder(updated);
      }
    );
  }, [order?.id, order?.lookupToken, order?.customer?.lastName]);

  useEffect(() => {
    if (!order) return;
    if (prevStatus.current && prevStatus.current !== 'READY' && order.status === 'READY') {
      setShowReadyAlert(true);
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6Wj4qGgH1tdH2Onp6Wj4qGgH1tdH2Onp6Wj4qGgH1t');
        }
        audioRef.current.play().catch(() => {});
      } catch { /* ignore */ }
    }
    prevStatus.current = order.status;
  }, [order?.status]);

  const handleResetLookup = () => {
    setOrder(null);
    setLookupMode(true);
    setVerifyMode(false);
    setError('');
    setOrderNumber('');
    setLastName('');
    setCancelError('');
    setCancelDialogOpen(false);
    window.history.replaceState(null, '', '/status');
  };

  const handleLookup = async () => {
    if (!selectedEventId) {
      setError('Bitte wählen Sie eine Veranstaltung aus.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await api.lookupOrder(selectedEventId, parseInt(orderNumber, 10), lastName);
      setOrder(result);
      setLookupMode(false);
      setCancelLastName(lastName);
      if (result.lookupToken) {
        window.history.replaceState({ order: result }, '', `/status/${result.lookupToken}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bestellung nicht gefunden');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!lookupToken || !lastName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.getOrderByToken(lookupToken, lastName.trim());
      setOrder(result);
      setVerifyMode(false);
      setCancelLastName(lastName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bestellung nicht gefunden');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    setCancelError('');
    try {
      const updated = await api.cancelOrder(order.lookupToken ?? lookupToken ?? '', cancelLastName.trim());
      setOrder(updated);
      setCancelDialogOpen(false);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Stornierung fehlgeschlagen');
    } finally {
      setCancelling(false);
    }
  };

  if (verifyMode) {
    return (
      <PublicLayout>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Bestellstatus
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Bitte bestätigen Sie Ihren Nachnamen, um den Bestellstatus anzuzeigen.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Paper sx={{ p: 3, maxWidth: 400 }}>
          <Stack spacing={2}>
            <TextField
              label="Nachname"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              fullWidth
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && void handleVerify()}
            />
            <Button variant="contained" size="large" onClick={() => void handleVerify()} disabled={loading || !lastName.trim()}>
              Anzeigen
            </Button>
          </Stack>
        </Paper>
      </PublicLayout>
    );
  }

  if (lookupMode) {
    if (eventsLoading) {
      return (
        <PublicLayout>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </PublicLayout>
      );
    }

    return (
      <PublicLayout>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Bestellstatus abfragen
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Geben Sie Ihre Abholnummer und Ihren Nachnamen ein.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {lookupEvents.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2, maxWidth: 400 }}>
            Derzeit sind keine Veranstaltungen für Statusabfragen verfügbar.
          </Alert>
        ) : (
          <Paper sx={{ p: 3, maxWidth: 400 }}>
            <Stack spacing={2}>
              {lookupEvents.length > 1 && (
                <FormControl fullWidth>
                  <InputLabel id="status-event-label">Veranstaltung</InputLabel>
                  <Select
                    labelId="status-event-label"
                    label="Veranstaltung"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>Veranstaltung wählen</em>
                    </MenuItem>
                    {lookupEvents.map((event) => (
                      <MenuItem key={event.id} value={event.id}>
                        {event.name} · {event.eventDateLabel}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <TextField
                label="Abholnummer"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="z.B. 042"
                fullWidth
              />
              <TextField
                label="Nachname"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                fullWidth
              />
              <Button
                variant="contained"
                size="large"
                startIcon={<SearchIcon />}
                onClick={() => void handleLookup()}
                disabled={loading || !selectedEventId}
              >
                Status abfragen
              </Button>
              <Button component={Link} to="/public" variant="text">
                Zur Bestellseite
              </Button>
            </Stack>
          </Paper>
        )}
      </PublicLayout>
    );
  }

  if (loading) {
    return (
      <PublicLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </PublicLayout>
    );
  }

  if (!order) {
    return (
      <PublicLayout>
        <Alert severity="error">{error || 'Bestellung nicht gefunden'}</Alert>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      {showReadyAlert && order.status === 'READY' && (
        <Alert
          severity="success"
          icon={<CheckCircleIcon fontSize="large" />}
          sx={{
            mb: 3,
            fontSize: '1.2rem',
            py: 2,
            animation: `${pulse} 1.5s ease-in-out infinite`,
            '& .MuiAlert-message': { fontWeight: 700 },
          }}
        >
          Ihre Bestellung ist jetzt abholbereit.
        </Alert>
      )}

      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="overline" color="text.secondary">
          Ihre Abholnummer
        </Typography>
        <Typography
          variant="h1"
          fontWeight={900}
          color="primary"
          sx={{ fontSize: { xs: '4rem', sm: '6rem' }, lineHeight: 1.1, my: 2 }}
        >
          {order.displayNumber}
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          Bitte merken Sie sich unbedingt Ihre Abholnummer oder zeigen Sie diese später an der Kasse vor.
        </Typography>
        {order.eventDateLabel && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Veranstaltungstag: {order.eventDateLabel}
          </Typography>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <StatusChip status={order.status} />
        </Box>

        <Box sx={{ mt: 2, textAlign: 'left', maxWidth: 520, mx: 'auto' }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
            Zusammenfassung
          </Typography>
          <Stack spacing={0.5} sx={{ mb: 1.5 }}>
            {order.items.map((item) => (
              <Box key={item.id || item.foodItemId} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="body1" sx={{ minWidth: 0 }}>
                  {item.quantity}× {item.name}
                </Typography>
                {item.lineTotal !== undefined && (
                  <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {formatPrice(item.lineTotal)}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
          <Typography variant="h6" fontWeight={800} sx={{ textAlign: 'right' }}>
            {formatPrice(order.totalPrice)}
          </Typography>
        </Box>

        {order.status === 'PICKED_UP' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Ihre Bestellung wurde abgeholt. Vielen Dank!
          </Alert>
        )}

        {order.status === 'CANCELLED' && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Diese Bestellung wurde storniert.
          </Alert>
        )}

        {order.canCancel && (
          <Box sx={{ mt: 3 }}>
            {order.cancellationDeadlineLabel && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Stornierung möglich bis: {order.cancellationDeadlineLabel}
              </Typography>
            )}
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => {
                setCancelError('');
                setCancelLastName(order.customer?.lastName || cancelLastName);
                setCancelDialogOpen(true);
              }}
            >
              Bestellung stornieren
            </Button>
          </Box>
        )}
      </Paper>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button variant="outlined" onClick={handleResetLookup}>
          Andere Bestellung abfragen
        </Button>
      </Box>

      <Dialog open={cancelDialogOpen} onClose={() => !cancelling && setCancelDialogOpen(false)}>
        <DialogTitle>Bestellung stornieren</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Möchten Sie Ihre Bestellung (Abholnummer {order.displayNumber}) wirklich stornieren?
            Dieser Vorgang kann nicht rückgängig gemacht werden.
          </DialogContentText>
          {cancelError && <Alert severity="error" sx={{ mb: 2 }}>{cancelError}</Alert>}
          <TextField
            label="Nachname zur Bestätigung"
            fullWidth
            value={cancelLastName}
            onChange={(e) => setCancelLastName(e.target.value)}
            helperText="Bitte geben Sie Ihren Nachnamen ein, um die Stornierung zu bestätigen."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)} disabled={cancelling}>
            Abbrechen
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleCancel}
            disabled={cancelling || !cancelLastName.trim()}
          >
            {cancelling ? 'Wird storniert…' : 'Stornieren'}
          </Button>
        </DialogActions>
      </Dialog>
    </PublicLayout>
  );
}
