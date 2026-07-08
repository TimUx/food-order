import { useState, useEffect, useMemo, useRef } from 'react';
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
import { api, formatPrice } from '@/services/api';
import { FoodItem } from '@/types';
import { OrderFieldConfig, DEFAULT_ORDER_FIELD_CONFIG } from '@/types/club';
import { touchFieldSx, touchPrimaryButtonSx, touchButtonSx } from '@/theme/touch';

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

  const turnstileRequired = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);

  useEffect(() => {
    Promise.all([api.getPublicMenu(), api.getOrderSettings()])
      .then(([menuData, settings]) => {
        setEventName(menuData.event.name);
        setEventDateLabel((menuData.event as { eventDateLabel?: string }).eventDateLabel || '');
        setItems(menuData.items);
        setFieldConfig(settings.fields);
        const initial: Record<string, number> = {};
        menuData.items.forEach((i) => { initial[i.id] = 0; });
        setQuantities(initial);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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

  const handleSubmit = async () => {
    if (!formValid) {
      setError('Bitte alle Pflichtfelder ausfüllen');
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
      const order = await api.createOrder({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        items: selectedItems,
        formStartedAt: formStartedAt.current,
        _hp: honeypot,
        turnstileToken: turnstileToken || undefined,
      });
      navigate(`/status/${order.id}`, { state: { order } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bestellung fehlgeschlagen');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
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
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h4" fontWeight={800} gutterBottom sx={{ mb: { xs: 0.5, sm: 1 } }}>
                {eventName || 'Essen bestellen'}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                Wählen Sie Ihre Gerichte und geben Sie Ihre Daten ein.
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
            {/* Honeypot – für Bots unsichtbar */}
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
              disabled={submitting || totalCount === 0 || !formValid || (turnstileRequired && !turnstileToken)}
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
              {submitting ? 'Wird gesendet…' : 'Bestellung absenden'}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </PublicLayout>
  );
}
