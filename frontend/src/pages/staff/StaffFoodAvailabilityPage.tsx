import { useState, useEffect, useCallback } from 'react';
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
import { useStaffEvent } from '@/contexts/StaffEventContext';
import { api, formatPrice } from '@/services/api';
import { FoodItem } from '@/types';

export function StaffFoodAvailabilityPage() {
  const { token } = useAuth();
  const { selectedEventId, events, loading: eventsLoading } = useStaffEvent();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!token || !selectedEventId) return;
    setItemsLoading(true);
    try {
      const foodItems = await api.getFoodItems(token, selectedEventId);
      setItems(foodItems.filter((i) => i.active));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speisen konnten nicht geladen werden');
    } finally {
      setItemsLoading(false);
    }
  }, [token, selectedEventId]);

  useEffect(() => {
    if (!selectedEventId) {
      setItems([]);
      return;
    }
    void loadItems();
  }, [selectedEventId, loadItems]);

  const handleToggle = async (item: FoodItem, soldOut: boolean) => {
    if (!token || !selectedEventId) return;
    setUpdatingId(item.id);
    setError('');
    try {
      await api.setFoodSoldOut(token, item.id, soldOut, selectedEventId);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, soldOut } : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setUpdatingId(null);
    }
  };

  if (eventsLoading) {
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
        Markieren Sie Speisen & Getränke als ausverkauft. Die Einstellung gilt jeweils für die gewählte Veranstaltung.
      </Typography>

      {events.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Derzeit sind keine Veranstaltungen angelegt. Legen Sie zuerst unter Veranstaltungen eine Veranstaltung an
          und ordnen Sie dort Speisen zu.
        </Alert>
      )}

      {itemsLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {!itemsLoading && selectedEventId && (
        <>
          {soldOutCount > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {soldOutCount} {soldOutCount === 1 ? 'Eintrag ist' : 'Einträge sind'} derzeit ausverkauft.
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
              Für diese Veranstaltung sind noch keine Speisen & Getränke zugeordnet.
            </Typography>
          )}
        </>
      )}
    </StaffLayout>
  );
}
