import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Stack,
  Divider,
  Link,
  Chip,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import { Order, OrderStatus } from '@/types';
import { formatPrice, formatTime } from '@/services/api';
import { StatusChip } from './StatusChip';

interface OrderCardProps {
  order: Order;
  onStatusChange?: (status: OrderStatus) => void;
  onAdvance?: () => void;
  onEdit?: () => void;
  showActions?: boolean;
  compact?: boolean;
  kitchenMode?: boolean;
}

export function OrderCard({
  order,
  onStatusChange,
  onAdvance,
  onEdit,
  showActions = false,
  compact = false,
  kitchenMode = false,
}: OrderCardProps) {
  const nextActions: { status: OrderStatus; label: string; color: 'primary' | 'success' | 'warning' | 'error' }[] = [];

  if (showActions) {
    if (order.status === 'NEW') {
      nextActions.push({ status: 'IN_PROGRESS', label: 'In Bearbeitung', color: 'warning' });
    }
    if (order.status === 'IN_PROGRESS') {
      nextActions.push({ status: 'READY', label: 'Fertig', color: 'success' });
    }
    if (kitchenMode && order.status === 'IN_PROGRESS') {
      nextActions.push({ status: 'READY', label: 'Fertig', color: 'success' });
    }
    if (!kitchenMode && ['NEW', 'IN_PROGRESS', 'READY'].includes(order.status)) {
      nextActions.push({ status: 'CANCELLED', label: 'Stornieren', color: 'error' });
    }
  }

  return (
    <Card
      sx={{
        borderLeft: 6,
        borderColor:
          order.status === 'NEW' ? 'info.main'
          : order.status === 'IN_PROGRESS' ? 'warning.main'
          : order.status === 'READY' ? 'success.main'
          : 'grey.400',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant={compact ? 'h5' : 'h4'} fontWeight={800} color="primary">
              #{order.displayNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatTime(order.createdAt)} · {order.sourceLabel}
            </Typography>
          </Box>
          <Stack spacing={0.5} alignItems="flex-end">
            <StatusChip status={order.status} />
            {order.paymentLabel && (
              <Chip size="small" label={order.paymentLabel} variant="outlined" color="default" />
            )}
          </Stack>
        </Box>

        {!compact && order.customer && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              {order.customer.firstName} {order.customer.lastName}
            </Typography>
            {(order.customer.email || order.customer.phone) && (
              <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                {order.customer.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} aria-hidden />
                    <Link href={`mailto:${order.customer.email}`} variant="body2" underline="hover">
                      {order.customer.email}
                    </Link>
                  </Box>
                )}
                {order.customer.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} aria-hidden />
                    <Link href={`tel:${order.customer.phone}`} variant="body2" underline="hover">
                      {order.customer.phone}
                    </Link>
                  </Box>
                )}
              </Stack>
            )}
          </Box>
        )}

        <Divider sx={{ my: 1 }} />

        <Stack spacing={0.5}>
          {order.items.map((item) => (
            <Box key={item.id || item.foodItemId} sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant={kitchenMode ? 'h6' : 'body1'} fontWeight={kitchenMode ? 600 : 400}>
                {item.quantity}× {item.name}
              </Typography>
              {!kitchenMode && item.lineTotal !== undefined && (
                <Typography variant="body2">{formatPrice(item.lineTotal)}</Typography>
              )}
            </Box>
          ))}
        </Stack>

        {!kitchenMode && (
          <Typography variant="h6" fontWeight={700} sx={{ mt: 1, textAlign: 'right' }}>
            {formatPrice(order.totalPrice)}
          </Typography>
        )}

        {showActions && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            {!kitchenMode && onEdit && ['NEW', 'IN_PROGRESS'].includes(order.status) && (
              <Button variant="outlined" size="small" onClick={onEdit}>
                Bearbeiten
              </Button>
            )}
            {kitchenMode && order.status === 'IN_PROGRESS' && onAdvance && (
              <Button
                variant="contained"
                color="success"
                size="large"
                fullWidth
                onClick={onAdvance}
                sx={{ minHeight: 56, fontSize: '1.2rem' }}
              >
                Fertig
              </Button>
            )}
            {!kitchenMode &&
              nextActions.map((action) => (
                <Button
                  key={action.status}
                  variant={action.color === 'error' ? 'outlined' : 'contained'}
                  color={action.color}
                  size="small"
                  onClick={() => onStatusChange?.(action.status)}
                >
                  {action.label}
                </Button>
              ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
