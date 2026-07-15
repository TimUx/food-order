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
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import { useNavigate, Link } from 'react-router-dom';
import { PublicLayout } from '@/components/PublicLayout';
import { PublicNoEventsNotice } from '@/components/PublicNoEventsNotice';
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
import { touchFieldSx, touchButtonSx, touchSquareActionSx } from '@/theme/touch';

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
  const theme = useTheme();
  const isMobileMenu = useMediaQuery(theme.breakpoints.down('sm'));
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
  const [orderStep, setOrderStep] = useState<'dishes' | 'checkout'>('dishes');

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
    setOrderStep('dishes');
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
    if (totalCount > 0 && formValid && orderStep === 'checkout') {
      void loadPaymentMethods();
    }
  }, [totalCount, formValid, orderStep, loadPaymentMethods]);

  const goToCheckout = () => {
    if (totalCount === 0) {
      setError('Bitte mindestens ein Gericht auswählen');
      return;
    }
    setError('');
    setOrderStep('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

      navigate(`/status/${order.lookupToken}`, { state: { order } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bestellung fehlgeschlagen');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = (order: Order) => {
    setPaymentDialogOpen(false);
    navigate(`/status/${order.lookupToken}`, { state: { order } });
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
        <PublicNoEventsNotice />
      </PublicLayout>
    );
  }

  if (!selectedEventId) {
    return (
      <PublicLayout fillHeight>
        <Typography
          variant="h4"
          fontWeight={800}
          gutterBottom
          sx={{ fontSize: { xs: '1.35rem', sm: '2.125rem' }, mb: { xs: 0.5, sm: 1 } }}
        >
          Veranstaltung wählen
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: { xs: 1.5, sm: 3 }, fontSize: { xs: '0.9rem', sm: '1rem' }, display: { xs: 'none', sm: 'block' } }}
        >
          Bitte wählen Sie die Veranstaltung, für die Sie bestellen möchten.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          {availableEvents.map((event) => (
            <Grid key={event.id} size={{ xs: 6, sm: 6, md: 4 }}>
              <Button
                variant="outlined"
                onClick={() => handleSelectEvent(event.id)}
                sx={{
                  ...touchSquareActionSx,
                  aspectRatio: '1 / 1',
                  minHeight: 'unset',
                  height: 'auto',
                  gap: 0,
                  justifyContent: 'flex-start',
                  p: { xs: 0.75, sm: 1.25 },
                  pt: { xs: 1, sm: 1.25 },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.25,
                    width: '100%',
                    textAlign: 'center',
                    px: 0.5,
                  }}
                >
                  <EventIcon
                    sx={{
                      fontSize: { xs: 28, sm: 36, md: 44 },
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="subtitle1"
                    fontWeight={800}
                    sx={{
                      fontSize: { xs: '0.85rem', sm: '1rem', md: '1.15rem' },
                      lineHeight: 1.2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {event.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2, mt: 0.25 }}>
                    {event.eventDateLabel}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
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

  if (items.length === 0) {
    const selectedEvent = availableEvents.find((event) => event.id === selectedEventId);
    const noticeReason = error ? 'unavailable' : 'no-menu';
    const noticeEventName = eventName || selectedEvent?.name;

    return (
      <PublicLayout>
        <PublicNoEventsNotice
          reason={noticeReason}
          eventName={noticeEventName}
          onBack={
            availableEvents.length > 1
              ? () => {
                  setSelectedEventId(null);
                  setItems([]);
                  setOrderStep('dishes');
                  setError('');
                  setEventName('');
                  setEventDateLabel('');
                }
              : undefined
          }
        />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout fillHeight={orderStep === 'dishes'} hideFooter={orderStep === 'dishes'}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: orderStep === 'dishes' ? 1 : undefined,
          minHeight: orderStep === 'dishes' ? 0 : undefined,
        }}
      >
        <Box sx={{ flexShrink: 0, mb: { xs: 1, sm: 2 } }}>
          {availableEvents.length > 1 && (
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => {
                if (orderStep === 'checkout') {
                  setOrderStep('dishes');
                  setError('');
                  return;
                }
                setSelectedEventId(null);
                setItems([]);
                setOrderStep('dishes');
                setError('');
              }}
              size="small"
              sx={{
                mb: { xs: 0.75, sm: 2 },
                ...touchButtonSx,
                minHeight: { xs: 40, sm: 48 },
                py: { xs: 0.5, sm: 1 },
                fontSize: { xs: '0.85rem', sm: '1rem' },
              }}
            >
              {orderStep === 'checkout' ? 'Zurück zu Gerichten' : 'Veranstaltung wechseln'}
            </Button>
          )}
          {orderStep === 'checkout' && availableEvents.length <= 1 && (
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => {
                setOrderStep('dishes');
                setError('');
              }}
              sx={{ mb: 2, ...touchButtonSx }}
            >
              Zurück zu Gerichten
            </Button>
          )}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: { xs: 1, sm: 2 } }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h4"
                fontWeight={800}
                gutterBottom
                sx={{
                  mb: { xs: 0.25, sm: 1 },
                  fontSize: { xs: '1.35rem', sm: '2.125rem' },
                  lineHeight: { xs: 1.2, sm: 1.3 },
                }}
              >
                {eventName || 'Essen bestellen'}
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  display: { xs: orderStep === 'dishes' ? 'none' : 'block', sm: 'block' },
                  fontSize: { xs: '0.9rem', sm: '1.1rem' },
                }}
              >
                {orderStep === 'dishes'
                  ? 'Wählen Sie Ihre Gerichte – im nächsten Schritt geben Sie Ihre Daten ein.'
                  : 'Geben Sie Ihre Daten ein und senden Sie die Bestellung ab.'}
              </Typography>
              {orderStep === 'dishes' && eventDateLabel && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: { xs: 'block', sm: 'none' }, mt: 0.25, lineHeight: 1.3 }}
                >
                  {eventDateLabel} · Vorbestellung möglich
                </Typography>
              )}
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
            <Alert
              severity="info"
              sx={{
                display: { xs: 'none', sm: 'flex' },
                mb: 2,
                py: 1,
                fontSize: '1rem',
              }}
            >
              {eventDateLabel} · Vorbestellung möglich
            </Alert>
          )}

          {error && <Alert severity="error" sx={{ mb: { xs: 1, sm: 2 } }}>{error}</Alert>}

          {orderStep === 'dishes' && (
            <Typography
              variant="h5"
              gutterBottom
              fontWeight={700}
              sx={{ display: { xs: 'none', sm: 'block' }, mb: 1 }}
            >
              Gerichte
            </Typography>
          )}
        </Box>

        {orderStep === 'dishes' ? (
          <>
            <Box
              data-testid="order-dishes-scroll"
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                pr: { xs: 0.25, sm: 1 },
                mr: { xs: -0.25, sm: -1 },
                pb: { xs: 11, sm: 2 },
              }}
            >
              <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ pb: { xs: 1, sm: 2 } }}>
                {items.map((item) => (
                  <Grid key={item.id} size={{ xs: 6, sm: 6 }}>
                    <FoodItemCard
                      item={item}
                      quantity={quantities[item.id] || 0}
                      onQuantityChange={(q) => setQuantities((prev) => ({ ...prev, [item.id]: q }))}
                      touchMode
                      compact={isMobileMenu}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Paper
              sx={{
                flexShrink: 0,
                p: { xs: 1.25, sm: 1.5 },
                mt: { xs: 0, sm: 1 },
                borderTop: 1,
                borderColor: 'divider',
                position: { xs: 'fixed', sm: 'static' },
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: (theme) => theme.zIndex.appBar - 1,
                borderRadius: 0,
                pb: { xs: 'max(12px, env(safe-area-inset-bottom))', sm: undefined },
              }}
              elevation={8}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={2}
                sx={{ maxWidth: 'md', mx: 'auto', px: { xs: 0.5, sm: 0 } }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                    <strong>{totalCount}</strong> {totalCount === 1 ? 'Gericht' : 'Gerichte'}
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="primary" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                    {formatPrice(totalPrice)}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  onClick={goToCheckout}
                  disabled={totalCount === 0}
                  sx={{
                    ...touchButtonSx,
                    minHeight: { xs: 48, sm: 52 },
                    fontSize: { xs: '1rem', sm: '1.05rem' },
                    px: { xs: 2, sm: 2.5 },
                    flexShrink: 0,
                  }}
                >
                  Weiter
                </Button>
              </Stack>
            </Paper>
          </>
        ) : (
          <Box component="section" data-testid="order-checkout-step">
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Ihre Auswahl
              </Typography>
              <Typography variant="body1" fontWeight={700}>
                {totalCount} {totalCount === 1 ? 'Gericht' : 'Gerichte'} · {formatPrice(totalPrice)}
              </Typography>
            </Paper>

            <Paper sx={{ p: 3, mb: 2 }} data-testid="order-customer-form">
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
                  <Button variant="contained" onClick={() => { void handleRetryWithNewMethod(); }} disabled={submitting || !isOnlineChoice(paymentChoice)} sx={touchButtonSx}>
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

            {turnstileRequired && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1, pb: 2 }}>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting || totalCount === 0 || !formValid || (turnstileRequired && !turnstileToken) || paymentMethodsLoading}
                startIcon={<ShoppingCartIcon />}
                sx={{
                  ...touchButtonSx,
                  minHeight: 52,
                  fontSize: '1.05rem',
                  px: 3,
                  width: { xs: '100%', sm: 'auto' },
                  maxWidth: 360,
                }}
              >
                {submitLabel}
              </Button>
            </Box>
          </Box>
        )}
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
