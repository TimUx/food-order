import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  Paper,
  Alert,
  CircularProgress,
  Stack,
  IconButton,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import { useNavigate, Link } from 'react-router-dom';
import { PublicLayout } from '@/components/PublicLayout';
import { FoodItemCard } from '@/components/FoodItemCard';
import { TurnstileWidget } from '@/components/TurnstileWidget';
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector';
import { PaymentDialog } from '@/components/PaymentDialog';
import EventIcon from '@mui/icons-material/Event';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { api, formatPrice } from '@/services/api';
import { FoodItem, Order, PublicEvent } from '@/types';
import { OrderFieldConfig, DEFAULT_ORDER_FIELD_CONFIG } from '@/types/club';
import type { PaymentChoiceId, PaymentMethodsResponse } from '@/types/payment';
import { buildPaymentSelection, isOnlineChoice, getPaymentOptionLabel } from '@/utils/paymentSelection';
import { touchFieldSx, touchPrimaryButtonSx, touchButtonSx, touchSquareActionSx } from '@/theme/touch';

function fieldLabel(name: string, required: boolean): string {
  return required ? `${name} *` : `${name} (optional)`;
}

function isFormValid(
  fields: OrderFieldConfig,
  data: { firstName: string; lastName: string; email: string; phone: string }
): boolean {
  if (fields.firstNameRequired && !data.firstName.trim()) return false;
  if (fields.lastNameRequired && !data.lastName.trim()) return false;
  if (fields.emailRequired && !data.email.trim()) return false;
  if (fields.phoneRequired && !data.phone.trim()) return false;
  return true;
}

export function OrderPage() {
  const navigate = useNavigate();
  const formStartedAt = useRef(Date.now());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [availableEvents, setAvailableEvents] = useState<PublicEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState('');
  const [eventDateLabel, setEventDateLabel] = useState('');
  const [items, setItems] = useState<FoodItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [fieldConfig, setFieldConfig] = useState<OrderFieldConfig>(DEFAULT_ORDER_FIELD_CONFIG);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsResponse | null>(null);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoiceId>('cash');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [changeMethodMode, setChangeMethodMode] = useState(false);

  const turnstileRequired = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);

  const loadMenu = useCallback(async (eventId: string) => {
    setLoading(true);
    setError('');
    try {
      const menuData = await api.getPublicMenu(eventId);
      setEventName(menuData.event.name);
      setEventDateLabel((menuData.event as { eventDateLabel?: string }).eventDateLabel || '');
      setItems(menuData.items);
      const initial: Record<string, number> = {};
      menuData.items.forEach((i) => { initial[i.id] = 0; });
      setQuantities(initial);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : 'Speisekarte konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    void loadMenu(eventId);
  };

  useEffect(() => {
    Promise.all([api.getPublicEvents(), api.getOrderSettings()])
      .then(([events, settings]) => {
        setAvailableEvents(events);
        setFieldConfig(settings.fields);
        if (events.length === 1) {
          setSelectedEventId(events[0].id);
          return loadMenu(events[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [loadMenu]);

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

  const formValid = useMemo(
    () => isFormValid(fieldConfig, { firstName, lastName, email, phone }),
    [fieldConfig, firstName, lastName, email, phone]
  );

  const paymentSelection = useMemo(() => {
    if (!paymentMethods) {
      return buildPaymentSelection([], true);
    }
    return buildPaymentSelection(paymentMethods.methods, paymentMethods.allowCashOnSite);
  }, [paymentMethods]);

  useEffect(() => {
    setPaymentChoice(paymentSelection.defaultChoice);
  }, [paymentSelection.defaultChoice]);

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

  useEffect(() => {
    if (totalCount > 0 && formValid) {
      void loadPaymentMethods();
    }
  }, [totalCount, formValid, loadPaymentMethods]);

  const handleSubmit = async () => {
    if (!formValid) {
      setError('Bitte alle Pflichtfelder ausfüllen');
      return;
    }
    if (!selectedEventId) {
      setError('Bitte wählen Sie eine Veranstaltung');
      return;
    }
    if (selectedItems.length === 0) {
      setError('Bitte mindestens ein Gericht auswählen');
      return;
    }
    if (turnstileRequired && !turnstileToken) {
      setError('Bitte bestätigen Sie die Sicherheitsprüfung');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const effectiveChoice = paymentSelection.showSelection
        ? paymentChoice
        : paymentSelection.defaultChoice;

      const order = await api.createOrder({
        eventId: selectedEventId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        items: selectedItems,
        paymentMethodId: isOnlineChoice(effectiveChoice) ? effectiveChoice : undefined,
        formStartedAt: formStartedAt.current,
        _hp: honeypot,
        turnstileToken: turnstileToken || undefined,
      });

      if (order.payment?.required) {
        if (!order.payment.checkoutUrl) {
          setError('Die Online-Zahlung konnte nicht gestartet werden. Bitte versuchen Sie es erneut oder wählen Sie Barzahlung.');
          return;
        }
        setPendingOrder(order);
        setPaymentDialogOpen(true);
        return;
      }

      navigate(`/status/${order.lookupToken ?? order.id}`, { state: { order } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bestellung fehlgeschlagen');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = (order: Order) => {
    setPaymentDialogOpen(false);
    navigate(`/status/${order.lookupToken ?? order.id}`, { state: { order } });
  };

  const handleChangePaymentMethod = () => {
    setPaymentDialogOpen(false);
    setChangeMethodMode(true);
    setError('');
  };

  const handleRetryWithNewMethod = async () => {
    if (!pendingOrder) return;
    const choice = paymentChoice;
    if (!isOnlineChoice(choice)) {
      setError('Bitte wählen Sie eine Online-Zahlungsart');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payment = await api.createOrderCheckout(pendingOrder.id, choice);
      setPendingOrder({ ...pendingOrder, payment: { ...payment, required: true } });
      setChangeMethodMode(false);
      setPaymentDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zahlung konnte nicht gestartet werden');
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel = useMemo(() => {
    if (submitting) return 'Wird gesendet…';
    const choice = paymentSelection.showSelection ? paymentChoice : paymentSelection.defaultChoice;
    if (isOnlineChoice(choice)) return 'Bestellen und bezahlen';
    return 'Bestellung absenden';
  }, [submitting, paymentSelection, paymentChoice]);

  if (loading) {
    return (
      <PublicLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </PublicLayout>
    );
  }

  if (availableEvents.length === 0) {
    return (
      <PublicLayout>
        <Alert severity="info">Derzeit sind keine Bestellungen möglich.</Alert>
      </PublicLayout>
    );
  }

  if (!selectedEventId) {
    return (
      <PublicLayout fillHeight>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Veranstaltung wählen
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Bitte wählen Sie die Veranstaltung, für die Sie bestellen möchten.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          {availableEvents.map((event) => (
            <Grid key={event.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Button
                variant="outlined"
                onClick={() => handleSelectEvent(event.id)}
                startIcon={<EventIcon />}
                sx={touchSquareActionSx}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={800}>{event.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {event.eventDateLabel}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {event.startTime} – {event.endTime}
                  </Typography>
                </Box>
              </Button>
            </Grid>
          ))}
        </Grid>
      </PublicLayout>
    );
  }

  if (items.length === 0 && !error) {
    return (
      <PublicLayout>
        <Alert severity="info">Derzeit sind keine Bestellungen möglich.</Alert>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout fillHeight>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        <Box sx={{ flexShrink: 0 }}>
          {availableEvents.length > 1 && (
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => {
                setSelectedEventId(null);
                setItems([]);
                setError('');
              }}
              sx={{ mb: 2, ...touchButtonSx }}
            >
              Veranstaltung wechseln
            </Button>
          )}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h4" fontWeight={800} gutterBottom sx={{ mb: { xs: 0.5, sm: 1 } }}>
                {eventName || 'Essen bestellen'}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                Wählen Sie zuerst Ihre Gerichte, dann geben Sie Ihre Daten ein.
              </Typography>
            </Box>
            <IconButton
              component={Link}
              to="/kontakt"
              aria-label="Kontakt"
              color="primary"
              sx={{
                display: { xs: 'inline-flex', sm: 'none' },
                flexShrink: 0,
                width: 44,
                height: 44,
                minWidth: 44,
                minHeight: 44,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                '& .MuiSvgIcon-root': { fontSize: 22 },
              }}
            >
              <ContactMailIcon />
            </IconButton>
            <Button
              component={Link}
              to="/kontakt"
              variant="outlined"
              startIcon={<ContactMailIcon />}
              sx={{ ...touchButtonSx, display: { xs: 'none', sm: 'inline-flex' }, flexShrink: 0, alignSelf: 'flex-start' }}
            >
              Kontakt
            </Button>
          </Box>
          {eventDateLabel && (
            <Alert severity="info" sx={{ mb: 3, py: { xs: 0.75, sm: 1 }, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              {eventDateLabel} · Vorbestellung möglich
            </Alert>
          )}

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Typography variant="h5" gutterBottom fontWeight={700} sx={{ mb: 1 }}>
            Gerichte
          </Typography>
        </Box>

        <Box
          data-testid="order-dishes-scroll"
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            pr: { xs: 0.5, sm: 1 },
            mr: { xs: -0.5, sm: -1 },
          }}
        >
          <Grid container spacing={2} sx={{ pb: 2 }}>
            {items.map((item) => (
              <Grid key={item.id} size={{ xs: 12, sm: 6 }}>
                <FoodItemCard
                  item={item}
                  quantity={quantities[item.id] || 0}
                  onQuantityChange={(q) => setQuantities((prev) => ({ ...prev, [item.id]: q }))}
                  touchMode
                />
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ flexShrink: 0 }}>
          <Paper sx={{ p: 3, mb: 2, mt: 1 }} data-testid="order-customer-form">
            <Typography variant="h5" gutterBottom fontWeight={700}>
              Ihre Daten
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label={fieldLabel('Vorname', fieldConfig.firstNameRequired)} fullWidth required={fieldConfig.firstNameRequired} value={firstName} onChange={(e) => setFirstName(e.target.value)} sx={touchFieldSx} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label={fieldLabel('Nachname', fieldConfig.lastNameRequired)} fullWidth required={fieldConfig.lastNameRequired} value={lastName} onChange={(e) => setLastName(e.target.value)} sx={touchFieldSx} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label={fieldLabel('E-Mail', fieldConfig.emailRequired)} type="email" fullWidth required={fieldConfig.emailRequired} value={email} onChange={(e) => setEmail(e.target.value)} sx={touchFieldSx} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label={fieldLabel('Telefon', fieldConfig.phoneRequired)} fullWidth required={fieldConfig.phoneRequired} value={phone} onChange={(e) => setPhone(e.target.value)} sx={touchFieldSx} />
              </Grid>
            </Grid>
            <Alert severity="info" sx={{ mt: 2 }}>
              Ihre Daten werden nur zur Abwicklung dieser Bestellung verwendet und nach der Veranstaltung gemäß unserer Datenschutzerklärung gelöscht.
            </Alert>
            <Box
              component="label"
              aria-hidden
              sx={{
                position: 'absolute',
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0,0,0,0)',
                whiteSpace: 'nowrap',
                border: 0,
              }}
            >
              Website
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </Box>
          </Paper>

          {changeMethodMode && pendingOrder && paymentSelection.showSelection && (
            <Paper sx={{ p: 2, mb: 2, border: 2, borderColor: 'warning.main' }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Andere Zahlungsart wählen
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Ihre Bestellung {pendingOrder.displayNumber} bleibt gespeichert.
              </Typography>
              <PaymentMethodSelector
                options={paymentSelection.options.filter((o) => o.type === 'online')}
                value={paymentChoice}
                onChange={setPaymentChoice}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button variant="contained" onClick={() => { void handleRetryWithNewMethod(); }} disabled={submitting || !isOnlineChoice(paymentChoice)} sx={touchPrimaryButtonSx}>
                  Mit dieser Zahlungsart fortfahren
                </Button>
                <Button variant="outlined" onClick={() => setChangeMethodMode(false)} sx={touchButtonSx}>
                  Abbrechen
                </Button>
              </Stack>
            </Paper>
          )}

          {!changeMethodMode && paymentSelection.showSelection && totalCount > 0 && (
            paymentMethodsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
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
        </Box>

        <Paper
          sx={{
            flexShrink: 0,
            p: 2,
            mt: 1,
            borderRadius: { xs: 0, sm: 2 },
            borderTop: 2,
            borderColor: 'primary.main',
            mx: { xs: -2, sm: 0 },
            mb: { xs: -3, sm: 0 },
          }}
          elevation={8}
        >
          {turnstileRequired && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />
            </Box>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
            <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography variant="h6">
                Gesamt: <strong>{totalCount}</strong> {totalCount === 1 ? 'Gericht' : 'Gerichte'}
              </Typography>
              <Typography variant="h5" fontWeight={800} color="primary">
                {formatPrice(totalPrice)}
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting || totalCount === 0 || !formValid || (turnstileRequired && !turnstileToken) || paymentMethodsLoading}
              sx={{
                ...touchPrimaryButtonSx,
                width: { xs: '100%', sm: 'auto' },
                minWidth: { sm: 280 },
                minHeight: 72,
                flexDirection: 'column',
                gap: 0.5,
                py: 1.5,
              }}
            >
              <ShoppingCartIcon sx={{ fontSize: 32 }} />
              {submitLabel}
            </Button>
          </Stack>
        </Paper>
      </Box>

      {pendingOrder?.payment && (
        <PaymentDialog
          open={paymentDialogOpen}
          order={pendingOrder}
          payment={pendingOrder.payment}
          paymentLabel={getPaymentOptionLabel(
            paymentSelection.options,
            paymentSelection.showSelection ? paymentChoice : paymentSelection.defaultChoice
          )}
          onSuccess={handlePaymentSuccess}
          onChangeMethod={handleChangePaymentMethod}
          onClose={() => setPaymentDialogOpen(false)}
        />
      )}
    </PublicLayout>
  );
}
