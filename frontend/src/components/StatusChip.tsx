import { Chip } from '@mui/material';
import { OrderStatus, STATUS_LABELS, STATUS_COLORS } from '@/types';

interface StatusChipProps {
  status: OrderStatus;
  size?: 'small' | 'medium';
}

export function StatusChip({ status, size = 'medium' }: StatusChipProps) {
  return (
    <Chip
      label={STATUS_LABELS[status]}
      color={STATUS_COLORS[status]}
      size={size}
      sx={{ fontWeight: 600 }}
    />
  );
}
