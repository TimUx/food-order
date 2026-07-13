import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  CircularProgress,
  Alert,
  Switch,
  FormControlLabel,
  Paper,
  Stack,
  Chip,
} from '@mui/material';
import { StaffLayout } from '@/components/StaffLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api, formatPrice } from '@/services/api';
import { FoodItem } from '@/types';

export function StaffFoodAvailabilityPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadItems = () => {
    if (!token || !eventId) return;
    api.getFoodItems(token, eventId)
      .then((foodItems) => setItems(foodItems.filter((i) => i.active)))
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    if (!token) return;
    api.getActiveEvent(token)
      .then((event) => setEventId(event.id))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    loadItems();
  }, [eventId, token]);

  const handleToggle = async (item: FoodItem, soldOut: boolean) => {
    if (!token) return;
    setUpdatingId(item.id);
    setError('');
    try {
      await api.setFoodSoldOut(token, item.id, soldOut, eventId);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, soldOut } : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <StaffLayout title="Verfügbarkeit">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </StaffLayout>
    );
  }

  const soldOutCount = items.filter((i) => i.soldOut).length;

  return (
    <StaffLayout title="Verfügbarkeit">
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Markieren Sie Gerichte als ausverkauft. Sie erscheinen in der Bestellung ausgegraut und können nicht mehr bestellt werden.
      </Typography>

      {soldOutCount > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {soldOutCount} {soldOutCount === 1 ? 'Gericht ist' : 'Gerichte sind'} derzeit ausverkauft.
        </Alert>
      )}

      <Stack spacing={1.5}>
        {items.map((item) => (
          <Paper
            key={item.id}
            variant="outlined"
            sx={{
              px: 2,
              py: 1.5,
              opacity: item.soldOut ? 0.75 : 1,
              bgcolor: item.soldOut ? 'action.hover' : 'background.paper',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ color: item.soldOut ? 'text.disabled' : 'text.primary' }}>
                    {item.name}
                  </Typography>
                  {item.soldOut && <Chip label="Ausverkauft" color="error" size="small" />}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {formatPrice(Number(item.price))}
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={item.soldOut}
                    color="error"
                    disabled={updatingId === item.id}
                    onChange={(e) => void handleToggle(item, e.target.checked)}
                  />
                }
                label={item.soldOut ? 'Ausverkauft' : 'Verfügbar'}
                labelPlacement="start"
                sx={{ m: 0, flexShrink: 0 }}
              />
            </Box>
          </Paper>
        ))}
      </Stack>

      {items.length === 0 && (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          Keine aktiven Gerichte vorhanden
        </Typography>
      )}
    </StaffLayout>
  );
}
