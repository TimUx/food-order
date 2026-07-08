import { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Grid,
  Box,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { StaffLayout } from '@/components/StaffLayout';
import { FoodItemCard } from '@/components/FoodItemCard';
import { useAuth } from '@/contexts/AuthContext';
import { api, formatPrice } from '@/services/api';
import { FoodItem } from '@/types';
import { touchPrimaryButtonSx } from '@/theme/touch';

export function LocalCashierPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.getActiveEvent(token)
      .then((event) => api.getFoodItems(token, event.id))
      .then((foodItems) => {
        setItems(foodItems.filter((i) => i.active && !i.soldOut));
        const initial: Record<string, number> = {};
        foodItems.forEach((i) => { initial[i.id] = 0; });
        setQuantities(initial);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

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
    if (!token || selectedItems.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const order = await api.createCashierOrder(token, selectedItems);
      setLastOrderNumber(order.displayNumber);
      const reset: Record<string, number> = {};
      items.forEach((i) => { reset[i.id] = 0; });
      setQuantities(reset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bestellung fehlgeschlagen');
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
            sx={{ ...touchPrimaryButtonSx, minHeight: 80, minWidth: 280, fontSize: '1.25rem' }}
          >
            Nächste Bestellung
          </Button>
        </Box>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout title="Bestellung" fullWidth>
      <Typography variant="h4" fontWeight={800} gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2rem' } }}>
        Bestellung vor Ort
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, fontSize: '1.1rem' }}>
        Gerichte auswählen und Bestellung speichern.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
            disabled={submitting || totalCount === 0}
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
            Bestellung speichern
          </Button>
        </Stack>
      </Paper>
    </StaffLayout>
  );
}
