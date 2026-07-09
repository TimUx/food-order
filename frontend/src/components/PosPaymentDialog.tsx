import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  Stack,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { PaymentQrCode } from '@/components/PaymentQrCode';
import { api, formatPrice, getImageUrl } from '@/services/api';
import { subscribePaymentStatus } from '@/services/realtime/channels';
import { useClub } from '@/contexts/ClubContext';
import type { Order } from '@/types';
import type { OrderPaymentInfo, PublicPaymentMethod } from '@/types/payment';
import {
  formatSupportedMethods,
  isPaymentFailure,
  isPaymentSuccess,
  posPaymentStatusLabel,
} from '@/utils/paymentSelection';
import { touchPrimaryButtonSx, touchButtonSx } from '@/theme/touch';

const AUTO_CLOSE_MS = 3500;

interface PosPaymentDialogProps {
  open: boolean;
  order: Order;
  payment: OrderPaymentInfo;
  eventName: string;
  paymentMethods: PublicPaymentMethod[];
  paymentLabel: string;
  token: string;
  onComplete: () => void;
  onChangeMethod: () => void;
  onAbort: () => void;
}

function formatRemainingTime(expiresAt?: string): string | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Abgelaufen';
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PosPaymentDialog({
  open,
  order,
  payment,
  eventName,
  paymentMethods,
  paymentLabel,
  token,
  onComplete,
  onChangeMethod,
  onAbort,
}: PosPaymentDialogProps) {
  const { club } = useClub();
  const [status, setStatus] = useState(payment.paymentStatus ?? 'PAYMENT_PENDING');
  const [checkoutUrl, setCheckoutUrl] = useState(payment.checkoutUrl);
  const [sessionId, setSessionId] = useState(payment.sessionId);
  const [expiresAt, setExpiresAt] = useState(payment.expiresAt);
  const [remaining, setRemaining] = useState<string | null>(formatRemainingTime(payment.expiresAt));
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [aborting, setAborting] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supportedLabels = formatSupportedMethods(paymentMethods);

  useEffect(() => {
    if (!open) return;
    setStatus(payment.paymentStatus ?? 'PAYMENT_PENDING');
    setCheckoutUrl(payment.checkoutUrl);
    setSessionId(payment.sessionId);
    setExpiresAt(payment.expiresAt);
    setError('');
    setNetworkError(false);
  }, [open, payment]);

  useEffect(() => {
    if (!open || !sessionId || isPaymentSuccess(status) || isPaymentFailure(status)) return;

    return subscribePaymentStatus(sessionId, async (result) => {
      if (result.paymentStatus) setStatus(result.paymentStatus);
      setNetworkError(false);
      if (result.checkoutUrl) setCheckoutUrl(result.checkoutUrl);
      if (result.expiresAt) setExpiresAt(result.expiresAt);

      if (result.paymentStatus === 'PAYMENT_TIMEOUT') {
        const retried = await api.retryPaymentCheckout(sessionId);
        setSessionId(retried.sessionId);
        setCheckoutUrl(retried.checkoutUrl);
        setExpiresAt(retried.expiresAt);
        setStatus(retried.paymentStatus ?? 'PAYMENT_PENDING');
        setError('Die Zahlungsfrist ist abgelaufen. Ein neuer QR-Code wurde erstellt.');
        return;
      }

      if (result.paymentStatus && isPaymentSuccess(result.paymentStatus)) {
        closeTimerRef.current = setTimeout(onComplete, AUTO_CLOSE_MS);
      }
    }, 'high');
  }, [open, sessionId, status, onComplete]);

  useEffect(() => {
    if (!open || !expiresAt) return;
    const tick = () => setRemaining(formatRemainingTime(expiresAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [open, expiresAt]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    setError('');
    try {
      const result = await api.retryPaymentCheckout(sessionId);
      setSessionId(result.sessionId);
      setCheckoutUrl(result.checkoutUrl);
      setExpiresAt(result.expiresAt);
      setStatus(result.paymentStatus ?? 'PAYMENT_PENDING');
      setNetworkError(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erneuter Zahlungsversuch fehlgeschlagen');
    } finally {
      setRetrying(false);
    }
  };

  const handleAbort = async () => {
    setAborting(true);
    try {
      await api.abortCashierPayment(token, order.id, sessionId);
      onAbort();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Abbruch fehlgeschlagen');
    } finally {
      setAborting(false);
    }
  };

  const success = isPaymentSuccess(status);
  const failure = isPaymentFailure(status);
  const waiting = !success && !failure;
  const logoUrl = getImageUrl(club.logoUrl ?? undefined);

  return (
    <Dialog
      open={open}
      fullScreen
      aria-labelledby="pos-payment-title"
      aria-describedby="pos-payment-description"
      disableEscapeKeyDown={waiting}
    >
      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          p: { xs: 2, sm: 4 },
          textAlign: 'center',
          bgcolor: 'background.default',
        }}
      >
        {!success && (
          <IconButton
            aria-label="Zahlung abbrechen"
            onClick={() => { void handleAbort(); }}
            disabled={aborting}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              minWidth: 56,
              minHeight: 56,
            }}
          >
            <CloseIcon sx={{ fontSize: 32 }} />
          </IconButton>
        )}

        {logoUrl && (
          <Box
            component="img"
            src={logoUrl}
            alt={club.clubName}
            sx={{ maxHeight: 64, maxWidth: 200, mb: 2, objectFit: 'contain' }}
          />
        )}

        {success ? (
          <Box sx={{ maxWidth: 480 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: { xs: 80, sm: 96 }, mb: 2 }} />
            <Typography id="pos-payment-title" variant="h4" fontWeight={800} gutterBottom>
              Zahlung erfolgreich
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
              Vielen Dank. Die Bestellung wurde an die Küche übermittelt.
            </Typography>
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '1rem' }}>
              Ihre Abholnummer
            </Typography>
            <Typography
              variant="h1"
              fontWeight={900}
              color="primary"
              sx={{ fontSize: { xs: '5rem', sm: '7rem' }, lineHeight: 1, my: 2 }}
            >
              {order.displayNumber}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxWidth: 520, width: '100%' }}>
            <Typography id="pos-payment-title" variant="h4" fontWeight={800} gutterBottom>
              Zahlung erforderlich
            </Typography>
            {eventName && (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2, fontSize: '1.1rem' }}>
                {eventName}
              </Typography>
            )}

            <Typography variant="overline" color="text.secondary">Gesamtbetrag</Typography>
            <Typography variant="h3" fontWeight={900} color="primary" sx={{ mb: 3 }}>
              {formatPrice(order.totalPrice)}
            </Typography>

            {waiting && checkoutUrl && (
              <>
                <PaymentQrCode
                  value={checkoutUrl}
                  size={Math.min(320, window.innerWidth - 48)}
                  label="QR-Code zum Bezahlen mit dem Smartphone"
                />
                <Typography id="pos-payment-description" variant="body1" sx={{ mt: 2, mb: 1, fontSize: '1.1rem' }}>
                  Online bezahlen mit
                </Typography>
                <List dense sx={{ display: 'inline-block', textAlign: 'left', mb: 2 }}>
                  {supportedLabels.map((label) => (
                    <ListItem key={label} sx={{ py: 0.25 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <FiberManualRecordIcon sx={{ fontSize: 10 }} />
                      </ListItemIcon>
                      <ListItemText primary={label} primaryTypographyProps={{ fontSize: '1.05rem' }} />
                    </ListItem>
                  ))}
                </List>
                <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.05rem' }}>
                  Bitte scannen Sie den QR-Code mit Ihrem Smartphone.
                </Typography>
              </>
            )}

            <Box
              sx={{ mt: 4, py: 2, borderTop: 1, borderColor: 'divider' }}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <Typography variant="overline" color="text.secondary">Status</Typography>
              {waiting && (
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5} sx={{ mt: 1 }}>
                  <FiberManualRecordIcon sx={{ color: 'warning.main', fontSize: 16 }} aria-hidden />
                  <Typography variant="h6" fontWeight={700}>
                    {posPaymentStatusLabel(status)}
                  </Typography>
                </Stack>
              )}
              {waiting && remaining && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Verbleibende Zeit: {remaining} · {paymentLabel}
                </Typography>
              )}

              {failure && (
                <Alert severity="error" icon={<ErrorOutlineIcon />} sx={{ mt: 2, textAlign: 'left' }}>
                  <Typography fontWeight={700}>Zahlung konnte nicht abgeschlossen werden.</Typography>
                </Alert>
              )}

              {networkError && waiting && (
                <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
                  Verbindungsproblem – Onlinezahlung vorübergehend eingeschränkt. Barzahlung ist weiterhin möglich.
                </Alert>
              )}

              {error && <Alert severity="info" sx={{ mt: 2 }}>{error}</Alert>}
            </Box>

            {failure && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={retrying ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                  onClick={() => { void handleRetry(); }}
                  disabled={retrying}
                  sx={{ ...touchPrimaryButtonSx, flex: 1, minHeight: 72 }}
                >
                  Erneut versuchen
                </Button>
                <Button
                  variant="outlined"
                  onClick={onChangeMethod}
                  sx={{ ...touchButtonSx, flex: 1, minHeight: 72 }}
                >
                  Andere Zahlungsart
                </Button>
              </Stack>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
