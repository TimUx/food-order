import { useState, useEffect, useMemo } from 'react';
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
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import { useNavigate, Link } from 'react-router-dom';
import { PublicLayout } from '@/components/PublicLayout';
import { FoodItemCard } from '@/components/FoodItemCard';
import { api, formatPrice } from '@/services/api';
import { FoodItem } from '@/types';
import { touchFieldSx, touchPrimaryButtonSx, touchButtonSx } from '@/theme/touch';

export function OrderPage() {
  const navigate = useNavigate();
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

  useEffect(() => {
    api.getPublicMenu()
      .then((data) => {
        setEventName(data.event.name);
        setEventDateLabel((data.event as { eventDateLabel?: string }).eventDateLabel || '');
        setItems(data.items);
        const initial: Record<string, number> = {};
        data.items.forEach((i) => { initial[i.id] = 0; });
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

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Bitte Vor- und Nachname eingeben');
      return;
    }
    if (selectedItems.length === 0) {
      setError('Bitte mindestens ein Gericht auswählen');
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
    <PublicLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            {eventName || 'Essen bestellen'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '1.05rem', sm: '1.1rem' } }}>
            Wählen Sie Ihre Gerichte und geben Sie Ihre Daten ein.
          </Typography>
        </Box>
        <Button
          component={Link}
          to="/kontakt"
          variant="outlined"
          startIcon={<ContactMailIcon />}
          sx={{ ...touchButtonSx, flexShrink: 0, minWidth: 120 }}
        >
          Kontakt
        </Button>
      </Box>
      {eventDateLabel && (
        <Alert severity="info" sx={{ mb: 3, fontSize: '1.05rem' }}>
          <strong>Veranstaltung:</strong> {eventDateLabel}
          <br />
          Sie können bereits jetzt vorbestellen – auch Tage oder Wochen vor der Veranstaltung.
          Ihre Abholnummer gilt am Veranstaltungstag.
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom fontWeight={700}>
          Ihre Daten
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Vorname *" fullWidth value={firstName} onChange={(e) => setFirstName(e.target.value)} sx={touchFieldSx} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Nachname *" fullWidth value={lastName} onChange={(e) => setLastName(e.target.value)} sx={touchFieldSx} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="E-Mail (optional)" type="email" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} sx={touchFieldSx} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Telefon (optional)" fullWidth value={phone} onChange={(e) => setPhone(e.target.value)} sx={touchFieldSx} />
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h5" gutterBottom fontWeight={700}>
        Gerichte
      </Typography>
      <Grid container spacing={2} sx={{ mb: 10 }}>
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

      <Paper
        sx={{
          p: 2,
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          borderRadius: 0,
          borderTop: 2,
          borderColor: 'primary.main',
        }}
        elevation={8}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
          <Box>
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
            disabled={submitting || totalCount === 0}
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
    </PublicLayout>
  );
}
