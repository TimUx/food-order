import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  Stack,
  keyframes,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PaymentQrCode } from '@/components/PaymentQrCode';
import { api, formatPrice } from '@/services/api';
import type { Order } from '@/types';
import type { OrderPaymentInfo } from '@/types/payment';
import { subscribePaymentStatus } from '@/services/realtime/channels';
import { isPaymentFailure, isPaymentSuccess, paymentStatusLabel } from '@/utils/paymentSelection';
import { touchPrimaryButtonSx, touchButtonSx } from '@/theme/touch';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

interface PaymentDialogProps {
  open: boolean;
  order: Order;
  payment: OrderPaymentInfo;
  paymentLabel: string;
  onSuccess: (order: Order) => void;
  onChangeMethod: () => void;
  onClose: () => void;
}

export function PaymentDialog({
  open,
  order,
  payment,
  paymentLabel,
  onSuccess,
  onChangeMethod,
  onClose,
}: PaymentDialogProps) {
  const [status, setStatus] = useState(payment.paymentStatus ?? 'PAYMENT_PENDING');
  const [checkoutUrl, setCheckoutUrl] = useState(payment.checkoutUrl);
  const [sessionId, setSessionId] = useState(payment.sessionId);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStatus(payment.paymentStatus ?? 'PAYMENT_PENDING');
    setCheckoutUrl(payment.checkoutUrl);
    setSessionId(payment.sessionId);
    setError('');
    setNetworkError(false);
  }, [open, payment]);

  useEffect(() => {
    if (!open || !sessionId || isPaymentSuccess(status) || isPaymentFailure(status)) return;

    return subscribePaymentStatus(sessionId, (result) => {
      if (result.paymentStatus) setStatus(result.paymentStatus);
      setNetworkError(false);
      if (result.checkoutUrl) setCheckoutUrl(result.checkoutUrl);

      if (result.paymentStatus && isPaymentSuccess(result.paymentStatus)) {
        void (async () => {
          const updatedOrder = order.lookupToken && order.customer?.lastName
            ? await api.getOrderByToken(order.lookupToken, order.customer.lastName)
            : order;
          onSuccess(updatedOrder);
        })();
      }
    }, 'high');
  }, [open, sessionId, status, order, onSuccess]);

  const handleRetry = async () => {
    setRetrying(true);
    setError('');
    try {
      const result = await api.retryPaymentCheckout(sessionId);
      setSessionId(result.sessionId);
      setCheckoutUrl(result.checkoutUrl);
      setStatus(result.paymentStatus ?? 'PAYMENT_PENDING');
      setNetworkError(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erneuter Zahlungsversuch fehlgeschlagen');
    } finally {
      setRetrying(false);
    }
  };

  const success = isPaymentSuccess(status);
  const failure = isPaymentFailure(status);
  const waiting = !success && !failure;

  return (
    <Dialog
      open={open}
      onClose={waiting ? undefined : (failure ? onClose : undefined)}
      fullWidth
      maxWidth="sm"
      aria-labelledby="payment-dialog-title"
      aria-describedby="payment-dialog-description"
    >
      <DialogContent sx={{ p: { xs: 2, sm: 4 }, textAlign: 'center' }}>
        <Typography
          id="payment-dialog-description"
          variant="body2"
          color="text.secondary"
          sx={success ? {
            position: 'absolute',
            width: 1,
            height: 1,
            p: 0,
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
            whiteSpace: 'nowrap',
            border: 0,
          } : { mb: 3 }}
        >
          {success
            ? 'Zahlung abgeschlossen'
            : 'Scannen Sie den QR-Code oder tippen Sie auf „Jetzt bezahlen“.'}
        </Typography>
        {success ? (
          <Box>
            <CheckCircleIcon color="success" sx={{ fontSize: 72, mb: 2 }} />
            <Typography id="payment-dialog-title" variant="h5" fontWeight={800} gutterBottom>
              Zahlung erfolgreich
            </Typography>
            <Typography variant="h3" fontWeight={900} color="primary" sx={{ my: 2 }}>
              {order.displayNumber}
            </Typography>
            <Typography color="text.secondary">
              Ihre Abholnummer – bitte merken oder später vorzeigen.
            </Typography>
          </Box>
        ) : (
          <>
            <Typography id="payment-dialog-title" variant="h5" fontWeight={800} gutterBottom>
              Bitte bezahlen Sie Ihre Bestellung
            </Typography>

            <Stack spacing={2} sx={{ mb: 3 }}>
              <Box>
                <Typography variant="overline" color="text.secondary">Betrag</Typography>
                <Typography variant="h4" fontWeight={800} color="primary">
                  {formatPrice(order.totalPrice)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">Zahlungsart</Typography>
                <Typography variant="body1" fontWeight={600}>
                  {paymentLabel}
                </Typography>
              </Box>
            </Stack>

            {waiting && checkoutUrl && (
              <>
                <PaymentQrCode value={checkoutUrl} size={Math.min(280, window.innerWidth - 80)} />
                <Button
                  variant="contained"
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<OpenInNewIcon />}
                  sx={{ ...touchPrimaryButtonSx, mt: 2, width: '100%' }}
                >
                  Jetzt bezahlen
                </Button>
              </>
            )}

            <Box
              sx={{ mt: 3, py: 2 }}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {waiting && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <CircularProgress size={28} aria-hidden />
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    sx={{
                      '@media (prefers-reduced-motion: no-preference)': {
                        animation: `${pulse} 2s ease-in-out infinite`,
                      },
                    }}
                  >
                    {paymentStatusLabel(status)}
                  </Typography>
                </Box>
              )}

              {failure && (
                <Alert severity="error" icon={<ErrorOutlineIcon />} sx={{ textAlign: 'left' }}>
                  <Typography fontWeight={700}>{paymentStatusLabel(status)}</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Ihre Bestellung bleibt gespeichert. Sie können erneut bezahlen oder eine andere Zahlungsart wählen.
                  </Typography>
                </Alert>
              )}

              {networkError && waiting && (
                <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
                  Verbindungsproblem – der Status wird automatisch erneut geprüft.
                </Alert>
              )}

              {error && <Alert severity="error" role="alert" sx={{ mt: 2 }}>{error}</Alert>}
            </Box>

            {waiting && (
              <Button
                variant="text"
                onClick={onChangeMethod}
                sx={{ ...touchButtonSx, mt: 2 }}
              >
                Andere Zahlungsart wählen
              </Button>
            )}

            {failure && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={retrying ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                  onClick={() => { void handleRetry(); }}
                  disabled={retrying}
                  sx={{ ...touchPrimaryButtonSx, flex: 1 }}
                >
                  Erneut bezahlen
                </Button>
                <Button
                  variant="outlined"
                  onClick={onChangeMethod}
                  sx={{ ...touchButtonSx, flex: 1 }}
                >
                  Andere Zahlungsart
                </Button>
              </Stack>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
