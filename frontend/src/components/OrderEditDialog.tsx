import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { FoodItemCard } from './FoodItemCard';
import { api, formatPrice } from '@/services/api';
import { FoodItem, Order } from '@/types';

interface OrderEditDialogProps {
  open: boolean;
  order: Order | null;
  eventId: string;
  token: string;
  onClose: () => void;
  onSaved: (order: Order) => void;
}

export function OrderEditDialog({
  open,
  order,
  eventId,
  token,
  onClose,
  onSaved,
}: OrderEditDialogProps) {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !order || !token) return;

    setError('');
    setLoading(true);
    api.getFoodItems(token, eventId)
      .then((items) => {
        const orderItemIds = new Set(order.items.map((i) => i.foodItemId));
        const available = items.filter((i) => i.active && !i.soldOut);
        const orderedUnavailable = items.filter(
          (i) => orderItemIds.has(i.id) && (!i.active || i.soldOut)
        );
        const displayItems = [
          ...available,
          ...orderedUnavailable.filter((i) => !available.some((a) => a.id === i.id)),
        ];
        setFoodItems(displayItems);
        const initial: Record<string, number> = {};
        displayItems.forEach((i) => { initial[i.id] = 0; });
        order.items.forEach((item) => {
          initial[item.foodItemId] = item.quantity;
        });
        setQuantities(initial);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Fehler beim Laden'))
      .finally(() => setLoading(false));
  }, [open, order, token, eventId]);

  const { totalPrice, selectedItems } = useMemo(() => {
    let price = 0;
    const selected: { foodItemId: string; quantity: number }[] = [];
    for (const item of foodItems) {
      const qty = quantities[item.id] || 0;
      if (qty > 0) {
        price += qty * Number(item.price);
        selected.push({ foodItemId: item.id, quantity: qty });
      }
    }
    return { totalPrice: price, selectedItems: selected };
  }, [foodItems, quantities]);

  const handleSave = async () => {
    if (!order || selectedItems.length === 0) return;
    setSaving(true);
    setError('');
    try {
      const updated = await api.updateOrderItems(token, order.id, selectedItems);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Bestellung #{order?.displayNumber} bearbeiten
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Gerichte entfernen (Menge 0), Anzahl ändern oder weitere Gerichte hinzufügen.
            </Typography>
            <Grid container spacing={2}>
              {foodItems.map((item) => {
                const unavailable = !item.active || item.soldOut;
                const inOrder = (quantities[item.id] || 0) > 0;
                return (
                  <Grid item xs={12} sm={6} key={item.id}>
                    <FoodItemCard
                      item={item}
                      quantity={quantities[item.id] || 0}
                      onQuantityChange={(qty) =>
                        setQuantities((prev) => ({ ...prev, [item.id]: qty }))
                      }
                      showSelector={!unavailable || inOrder}
                      allowUnavailableEdit={unavailable && inOrder}
                    />
                  </Grid>
                );
              })}
            </Grid>
            {foodItems.length === 0 && (
              <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                Keine verfügbaren Gerichte
              </Typography>
            )}
            <Typography variant="h6" fontWeight={700} sx={{ mt: 2, textAlign: 'right' }}>
              Gesamt: {formatPrice(totalPrice)}
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Abbrechen
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={saving || loading || selectedItems.length === 0}
        >
          {saving ? 'Speichern…' : 'Speichern'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
