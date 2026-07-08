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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useParams, useLocation, Link } from 'react-router-dom';
import { PublicLayout } from '@/components/PublicLayout';
import { StatusChip } from '@/components/StatusChip';
import { api } from '@/services/api';
import { joinOrder, onOrderUpdated } from '@/services/socket';
import { Order } from '@/types';

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

export function OrderStatusPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const [order, setOrder] = useState<Order | null>((location.state as { order?: Order })?.order || null);
  const [loading, setLoading] = useState(!order);
  const [error, setError] = useState('');
  const [lookupMode, setLookupMode] = useState(!orderId);
  const [orderNumber, setOrderNumber] = useState('');
  const [lastName, setLastName] = useState('');
  const [showReadyAlert, setShowReadyAlert] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelLastName, setCancelLastName] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const prevStatus = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!orderId || order) return;
    api.getOrder(orderId)
      .then(setOrder)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId, order]);

  useEffect(() => {
    if (!order) return;
    joinOrder(order.id);
    const unsub = onOrderUpdated((updated) => {
      const updatedOrder = updated as Order;
      if (updatedOrder.id === order.id) {
        setOrder(updatedOrder);
      }
    });
    return unsub;
  }, [order?.id]);

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

  const handleLookup = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.lookupOrder(parseInt(orderNumber, 10), lastName);
      setOrder(result);
      setLookupMode(false);
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
      const updated = await api.cancelOrder(order.id, cancelLastName.trim());
      setOrder(updated);
      setCancelDialogOpen(false);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Stornierung fehlgeschlagen');
    } finally {
      setCancelling(false);
    }
  };

  if (lookupMode) {
    return (
      <PublicLayout>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Bestellstatus abfragen
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Geben Sie Ihre Abholnummer und Ihren Nachnamen ein.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Paper sx={{ p: 3, maxWidth: 400 }}>
          <Stack spacing={2}>
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
              onClick={handleLookup}
              disabled={loading}
            >
              Status abfragen
            </Button>
            <Button component={Link} to="/" variant="text">
              Zur Bestellseite
            </Button>
          </Stack>
        </Paper>
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
        <Button component={Link} to="/status" variant="outlined">
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
