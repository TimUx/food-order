import { useState, useEffect, useRef } from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import { api } from '@/services/api';
import { getSocket, joinEvent, onOrderUpdated } from '@/services/socket';
import { PickupBoardOrder } from '@/types';

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
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const prevCount = useRef(0);

  const loadOrders = () => {
    api.getPickupBoard()
      .then(setOrders)
      .catch(() => {});
  };

  useEffect(() => {
    loadOrders();
    api.getPublicEvent().then((event) => {
      joinEvent(event.id);
    }).catch(() => {});

    const unsub = onOrderUpdated(() => loadOrders());
    const interval = setInterval(loadOrders, 10000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (orders.length > prevCount.current) {
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6Wj4qGgH1tdH2Onp6Wj4qGgH1tdH2Onp6Wj4qGgH1t');
        audio.play().catch(() => {});
      } catch { /* ignore */ }
    }
    prevCount.current = orders.length;
  }, [orders.length]);

  useEffect(() => {
    const socket = getSocket();
    const handler = (updated: unknown) => {
      const order = updated as { id: string; status: string };
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
    };
    socket.on('order:updated', handler);
    return () => { socket.off('order:updated', handler); };
  }, []);

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
        sx={{ mb: 4, fontSize: { xs: '2rem', md: '3rem' } }}
      >
        Abholbereit
      </Typography>

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
