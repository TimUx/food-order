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
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import { StaffLayout } from '@/components/StaffLayout';
import { FoodItemCard } from '@/components/FoodItemCard';
import { useAuth } from '@/contexts/AuthContext';
import { api, formatPrice } from '@/services/api';
import { FoodItem } from '@/types';

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
      <StaffLayout title="Lokale Kasse">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </StaffLayout>
    );
  }

  if (lastOrderNumber) {
    return (
      <StaffLayout title="Lokale Kasse" fullWidth>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
          }}
        >
          <Typography variant="overline" color="text.secondary">
            Abholnummer
          </Typography>
          <Typography
            variant="h1"
            fontWeight={900}
            color="primary"
            sx={{ fontSize: { xs: '6rem', md: '10rem' }, my: 2 }}
          >
            {lastOrderNumber}
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => setLastOrderNumber(null)}
            sx={{ mt: 4, minHeight: 56 }}
          >
            Nächste Bestellung
          </Button>
        </Box>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout title="Lokale Kasse" fullWidth>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Kassenbestellung aufgeben
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {items.map((item) => (
          <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <FoodItemCard
              item={item}
              quantity={quantities[item.id] || 0}
              onQuantityChange={(q) => setQuantities((prev) => ({ ...prev, [item.id]: q }))}
            />
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3, position: 'sticky', bottom: 16 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">{totalCount} Gerichte</Typography>
            <Typography variant="h4" fontWeight={800} color="primary">
              {formatPrice(totalPrice)}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<PointOfSaleIcon />}
            onClick={handleSubmit}
            disabled={submitting || totalCount === 0}
            sx={{ minWidth: 200, minHeight: 56 }}
          >
            Bestellung speichern
          </Button>
        </Stack>
      </Paper>
    </StaffLayout>
  );
}
