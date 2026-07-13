import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Typography,
  Grid,
  Box,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { StaffLayout } from '@/components/StaffLayout';
import { StaffKioskActions } from '@/components/StaffKioskActions';
import { FoodItemCard } from '@/components/FoodItemCard';
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector';
import { PosPaymentDialog } from '@/components/PosPaymentDialog';
import { useAuth } from '@/contexts/AuthContext';
import { api, formatPrice } from '@/services/api';
import { FoodItem, Order, PublicEvent } from '@/types';
import type { PaymentChoiceId, PaymentMethodsResponse } from '@/types/payment';
import { buildPosPaymentSelection, isOnlineChoice } from '@/utils/paymentSelection';
import { resolvePreferredEventId } from '@/utils/eventSelection';
import { touchPrimaryButtonSx, touchFieldSx } from '@/theme/touch';

export function BestellungPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [cashierEvents, setCashierEvents] = useState<PublicEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsResponse | null>(null);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoiceId>('cash');
  const [posPaymentOpen, setPosPaymentOpen] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [changeMethodMode, setChangeMethodMode] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.getCashierEvents(token)
      .then((events) => {
        setCashierEvents(events);
        const todayEvent = resolvePreferredEventId(events);
        setSelectedEventId(todayEvent);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || !selectedEventId) {
      setItems([]);
      return;
    }
    api.getFoodItems(token, selectedEventId)
      .then((foodItems) => {
        setItems(foodItems.filter((i) => i.active));
        const initial: Record<string, number> = {};
        foodItems.forEach((i) => { initial[i.id] = 0; });
        setQuantities(initial);
      })
      .catch((err) => setError(err.message));
  }, [token, selectedEventId]);

  const loadPaymentMethods = useCallback(async () => {
    if (paymentMethods !== null || paymentMethodsLoading) return;
    setPaymentMethodsLoading(true);
    try {
      const data = await api.getPaymentMethods();
      setPaymentMethods(data);
    } catch {
      setPaymentMethods({ allowCashOnSite: true, methods: [] });
    } finally {
      setPaymentMethodsLoading(false);
    }
  }, [paymentMethods, paymentMethodsLoading]);

  const { totalCount, totalPrice, selectedItems } = useMemo(() => {
    let count = 0;
    let price = 0;
    const selected: { foodItemId: string; quantity: number }[] = [];
    for (const item of items) {
      const qty = quantities[item.id] || 0;
      if (qty > 0) {
        count += qty;
        price += qty * Number(item.price);
        selected.push({ foodItemId: item.id, quantity: qty });
      }
    }
    return { totalCount: count, totalPrice: price, selectedItems: selected };
  }, [items, quantities]);

  const paymentSelection = useMemo(() => {
    if (!paymentMethods) return buildPosPaymentSelection([], true);
    return buildPosPaymentSelection(paymentMethods.methods, paymentMethods.allowCashOnSite);
  }, [paymentMethods]);

  useEffect(() => {
    setPaymentChoice(paymentSelection.defaultChoice);
  }, [paymentSelection.defaultChoice]);

  useEffect(() => {
    if (totalCount > 0) void loadPaymentMethods();
  }, [totalCount, loadPaymentMethods]);

  const resetOrderForm = () => {
    const reset: Record<string, number> = {};
    items.forEach((i) => { reset[i.id] = 0; });
    setQuantities(reset);
    setPendingOrder(null);
    setPosPaymentOpen(false);
    setChangeMethodMode(false);
  };

  const handleSubmit = async () => {
    if (!token || !selectedEventId || selectedItems.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const effectiveChoice = paymentSelection.showSelection && !changeMethodMode
        ? paymentChoice
        : changeMethodMode
          ? paymentChoice
          : paymentSelection.defaultChoice;

      const order = await api.createCashierOrder(
        token,
        selectedEventId,
        selectedItems,
        isOnlineChoice(effectiveChoice) ? effectiveChoice : undefined
      );

      if (order.payment?.required) {
        if (!order.payment.checkoutUrl) {
          setError('Die Online-Zahlung konnte nicht gestartet werden. Bitte erneut versuchen oder Barzahlung wählen.');
          return;
        }
        setPendingOrder(order);
        setPosPaymentOpen(true);
        setChangeMethodMode(false);
        return;
      }

      setLastOrderNumber(order.displayNumber);
      resetOrderForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bestellung fehlgeschlagen');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePosComplete = () => {
    if (pendingOrder) setLastOrderNumber(pendingOrder.displayNumber);
    resetOrderForm();
  };

  const handlePosAbort = () => {
    resetOrderForm();
    setError('');
  };

  const handleChangeMethod = () => {
    setPosPaymentOpen(false);
    setChangeMethodMode(true);
  };

  const handleRetryWithNewMethod = async () => {
    if (!token || !pendingOrder) return;
    if (!isOnlineChoice(paymentChoice)) {
      setError('Bitte wählen Sie eine Online-Zahlungsart');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payment = await api.createOrderCheckout(pendingOrder.id, paymentChoice);
      setPendingOrder({
        ...pendingOrder,
        payment: { ...payment, required: true },
      });
      setChangeMethodMode(false);
      setPosPaymentOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zahlung konnte nicht gestartet werden');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <StaffLayout title="Bestellung" fullWidth>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </StaffLayout>
    );
  }

  if (lastOrderNumber) {
    return (
      <StaffLayout title="Bestellung" fullWidth>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            px: 2,
          }}
        >
          <Typography variant="overline" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
            Abholnummer
          </Typography>
          <Typography
            variant="h1"
            fontWeight={900}
            color="primary"
            sx={{ fontSize: { xs: '5rem', sm: '8rem', md: '10rem' }, my: 2, lineHeight: 1 }}
          >
            {lastOrderNumber}
          </Typography>
          <Button
            variant="contained"
            onClick={() => setLastOrderNumber(null)}
            sx={{ ...touchPrimaryButtonSx, minHeight: 80, minWidth: 280, fontSize: '1.25rem', mb: 3 }}
          >
            Nächste Bestellung
          </Button>
          <StaffKioskActions />
        </Box>
      </StaffLayout>
    );
  }

  const selectedEvent = cashierEvents.find((event) => event.id === selectedEventId);

  return (
    <StaffLayout title="Bestellung" fullWidth>
      <Typography variant="h4" fontWeight={800} gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2rem' } }}>
        Bestellung vor Ort
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2, fontSize: '1.1rem' }}>
        Veranstaltung wählen und Gerichte auswählen.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <FormControl fullWidth sx={{ mb: 3, ...touchFieldSx }}>
        <InputLabel id="cashier-event-label">Veranstaltung</InputLabel>
        <Select
          labelId="cashier-event-label"
          label="Veranstaltung"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          displayEmpty
        >
          <MenuItem value="">
            <em>Veranstaltung wählen</em>
          </MenuItem>
          {cashierEvents.map((event) => (
            <MenuItem key={event.id} value={event.id}>
              {event.name} · {event.eventDateLabel}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {!selectedEventId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Bitte wählen Sie zuerst eine Veranstaltung aus.
        </Alert>
      )}

      {changeMethodMode && pendingOrder && (
        <Paper sx={{ p: 2, mb: 2, border: 2, borderColor: 'warning.main' }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Andere Zahlungsart wählen
          </Typography>
          <PaymentMethodSelector
            options={paymentSelection.options}
            value={paymentChoice}
            onChange={setPaymentChoice}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="contained"
              onClick={() => { void handleRetryWithNewMethod(); }}
              disabled={submitting || !isOnlineChoice(paymentChoice)}
              sx={touchPrimaryButtonSx}
            >
              Mit dieser Zahlungsart fortfahren
            </Button>
            <Button variant="outlined" onClick={() => setChangeMethodMode(false)}>
              Abbrechen
            </Button>
          </Stack>
        </Paper>
      )}

      <Grid container spacing={2} sx={{ mb: 12 }}>
        {items.map((item) => (
          <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <FoodItemCard
              item={item}
              quantity={quantities[item.id] || 0}
              onQuantityChange={(q) => setQuantities((prev) => ({ ...prev, [item.id]: q }))}
              touchMode
            />
          </Grid>
        ))}
      </Grid>

      {!changeMethodMode && paymentSelection.showSelection && totalCount > 0 && (
        paymentMethodsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, mb: 2 }}>
            <CircularProgress size={28} aria-label="Zahlungsarten werden geladen" />
          </Box>
        ) : (
          <PaymentMethodSelector
            options={paymentSelection.options}
            value={paymentChoice}
            onChange={setPaymentChoice}
          />
        )
      )}

      <Paper
        sx={{
          p: 2,
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: posPaymentOpen ? 1000 : 1100,
          borderRadius: 0,
          borderTop: 2,
          borderColor: 'primary.main',
        }}
        elevation={8}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={2}
          sx={{ maxWidth: 1200, mx: 'auto', px: { sm: 2 } }}
        >
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="h6" sx={{ fontSize: '1.15rem' }}>
              {totalCount} {totalCount === 1 ? 'Gericht' : 'Gerichte'}
            </Typography>
            <Typography variant="h4" fontWeight={800} color="primary">
              {formatPrice(totalPrice)}
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || !selectedEventId || totalCount === 0 || paymentMethodsLoading || posPaymentOpen}
            sx={{
              ...touchPrimaryButtonSx,
              minHeight: 72,
              fontSize: '1.25rem',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1,
              minWidth: { sm: 260 },
            }}
          >
            <SaveIcon sx={{ fontSize: 32 }} />
            {submitting ? 'Wird gespeichert…' : 'Bestellung speichern'}
          </Button>
        </Stack>
      </Paper>

      {pendingOrder?.payment && token && (
        <PosPaymentDialog
          open={posPaymentOpen}
          order={pendingOrder}
          payment={pendingOrder.payment}
          eventName={selectedEvent?.name ?? ''}
          paymentMethods={paymentMethods?.methods ?? []}
          paymentLabel={paymentSelection.options.find((o) => o.id === paymentChoice)?.label ?? 'Online bezahlen'}
          token={token}
          onComplete={handlePosComplete}
          onChangeMethod={handleChangeMethod}
          onAbort={handlePosAbort}
        />
      )}
    </StaffLayout>
  );
}
