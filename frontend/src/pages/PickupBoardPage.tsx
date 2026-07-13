import { useState, useEffect, useRef } from 'react';
import { Box, Typography, keyframes, Button, Grid, CircularProgress } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { api } from '@/services/api';
import { realtimeService } from '@/services/realtime';
import { PickupBoardOrder, PublicEvent } from '@/types';
import { resolveDefaultEventId } from '@/utils/eventSelection';
import { touchSquareActionSx } from '@/theme/touch';

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
`;

const slideOut = keyframes`
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.5); }
`;

export function PickupBoardPage() {
  const [orders, setOrders] = useState<PickupBoardOrder[]>([]);
  const [availableEvents, setAvailableEvents] = useState<PublicEvent[]>([]);
  const [eventId, setEventId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const prevCount = useRef(0);

  useEffect(() => {
    api.getPublicPickupEvents()
      .then((events) => {
        setAvailableEvents(events);
        const defaultId = resolveDefaultEventId(events);
        if (defaultId) {
          const event = events.find((entry) => entry.id === defaultId) ?? null;
          setSelectedEvent(event);
          setEventId(defaultId);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Keine Veranstaltung'))
      .finally(() => setLoading(false));
    realtimeService.connect();
  }, []);

  useEffect(() => {
    if (!eventId) return;
    void api.getPickupBoard(eventId).then(setOrders).catch(() => {});
    return realtimeService.subscribe(
      `pickup:${eventId}`,
      (msg) => {
        if (msg.type === 'order:updated') {
          const order = msg.payload as { id: string; status: string };
          if (order.status === 'PICKED_UP') {
            setRemoving((prev) => new Set(prev).add(order.id));
            setTimeout(() => {
              setOrders((prev) => prev.filter((o) => o.id !== order.id));
              setRemoving((prev) => {
                const next = new Set(prev);
                next.delete(order.id);
                return next;
              });
            }, 600);
          }
        }
      },
      {
        wsEvents: ['order:updated'],
        join: () => realtimeService.joinPickupBoard(eventId),
        activity: 'high',
        poll: (etag) => api.syncPickupBoard(eventId, etag),
        onPollData: (data) => setOrders(data as PickupBoardOrder[]),
      }
    );
  }, [eventId]);

  useEffect(() => {
    if (orders.length > prevCount.current) {
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6Wj4qGgH1tdH2Onp6Wj4qGgH1tdH2Onp6Wj4qGgH1t');
        audio.play().catch(() => {});
      } catch { /* ignore */ }
    }
    prevCount.current = orders.length;
  }, [orders.length]);

  const handleSelectEvent = (event: PublicEvent) => {
    setSelectedEvent(event);
    setEventId(event.id);
    setOrders([]);
    setError('');
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#e94560' }} />
      </Box>
    );
  }

  if (availableEvents.length === 0) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#1a1a2e', color: '#fff', p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h4" color="grey.500">
          Keine Veranstaltung für Abholungen verfügbar
        </Typography>
      </Box>
    );
  }

  if (!eventId) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#1a1a2e', color: '#fff', p: 4 }}>
        <Typography variant="h2" align="center" fontWeight={800} sx={{ mb: 2, fontSize: { xs: '2rem', md: '3rem' } }}>
          Veranstaltung wählen
        </Typography>
        <Typography variant="h5" align="center" color="grey.400" sx={{ mb: 4 }}>
          Bitte wählen Sie die Veranstaltung für das Abholboard.
        </Typography>
        {error && (
          <Typography variant="body1" align="center" color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <Grid container spacing={3} sx={{ maxWidth: 1200, mx: 'auto' }}>
          {availableEvents.map((event) => (
            <Grid key={event.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Button
                variant="outlined"
                onClick={() => handleSelectEvent(event)}
                startIcon={<EventIcon />}
                sx={{
                  ...touchSquareActionSx,
                  color: '#fff',
                  borderColor: '#0f3460',
                  bgcolor: '#16213e',
                  '&:hover': { bgcolor: '#0f3460', borderColor: '#e94560' },
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={800}>{event.name}</Typography>
                  <Typography variant="body1" color="grey.400">
                    {event.eventDateLabel}
                  </Typography>
                  <Typography variant="body2" color="grey.500">
                    {event.startTime} – {event.endTime}
                  </Typography>
                </Box>
              </Button>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#1a1a2e',
        color: '#fff',
        p: 4,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography
        variant="h2"
        align="center"
        fontWeight={800}
        sx={{ mb: 1, fontSize: { xs: '2rem', md: '3rem' } }}
      >
        Abholbereit
      </Typography>
      {selectedEvent && (
        <Typography variant="h5" align="center" color="grey.400" sx={{ mb: 2 }}>
          {selectedEvent.name} · {selectedEvent.eventDateLabel}
        </Typography>
      )}
      {availableEvents.length > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setEventId('');
              setSelectedEvent(null);
              setOrders([]);
            }}
            sx={{ color: '#fff', borderColor: '#0f3460' }}
          >
            Veranstaltung wechseln
          </Button>
        </Box>
      )}
      {error && (
        <Typography variant="body1" align="center" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          justifyContent: 'center',
          alignContent: 'flex-start',
        }}
      >
        {orders.length === 0 && (
          <Typography variant="h4" color="grey.500" sx={{ mt: 8 }}>
            Keine Bestellungen abholbereit
          </Typography>
        )}
        {orders.map((order) => (
          <Box
            key={order.id}
            sx={{
              width: { xs: 140, sm: 180, md: 220 },
              height: { xs: 140, sm: 180, md: 220 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#16213e',
              borderRadius: 4,
              border: '4px solid #0f3460',
              animation: removing.has(order.id)
                ? `${slideOut} 0.6s ease forwards`
                : `${fadeIn} 0.5s ease`,
            }}
          >
            <Typography
              fontWeight={900}
              color="#e94560"
              sx={{ fontSize: { xs: '3rem', sm: '4rem', md: '5rem' } }}
            >
              {order.displayNumber}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
