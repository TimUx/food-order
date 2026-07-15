import { Box, IconButton, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'small' | 'large' | 'touch' | 'compact';
}

export function QuantitySelector({
  value,
  onChange,
  min = 0,
  max = 99,
  size = 'large',
}: QuantitySelectorProps) {
  const isTouch = size === 'touch';
  const isCompact = size === 'compact';
  const isLarge = size === 'large' || isTouch;
  const buttonSize = isTouch ? 56 : isCompact ? 36 : isLarge ? 48 : 36;
  const fontSize = isTouch ? '1.75rem' : isCompact ? '1.1rem' : isLarge ? '1.5rem' : '1.1rem';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: isTouch ? 1.5 : isCompact ? 0.75 : 1 }}>
      <IconButton
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Menge verringern"
        sx={{
          width: buttonSize,
          height: buttonSize,
          border: 2,
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <RemoveIcon fontSize={isTouch ? 'large' : isCompact ? 'small' : 'medium'} />
      </IconButton>
      <Typography
        variant={isLarge ? 'h5' : 'h6'}
        sx={{
          minWidth: isTouch ? 48 : isCompact ? 28 : 40,
          textAlign: 'center',
          fontWeight: 700,
          fontSize,
        }}
        aria-live="polite"
      >
        {value}
      </Typography>
      <IconButton
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Menge erhöhen"
        sx={{
          width: buttonSize,
          height: buttonSize,
          border: 2,
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <AddIcon fontSize={isTouch ? 'large' : isCompact ? 'small' : 'medium'} />
      </IconButton>
    </Box>
  );
}
