import { Box, IconButton, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'small' | 'large';
}

export function QuantitySelector({
  value,
  onChange,
  min = 0,
  max = 99,
  size = 'large',
}: QuantitySelectorProps) {
  const isLarge = size === 'large';
  const buttonSize = isLarge ? 48 : 36;
  const fontSize = isLarge ? '1.5rem' : '1.1rem';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <IconButton
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Menge verringern"
        sx={{
          width: buttonSize,
          height: buttonSize,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <RemoveIcon />
      </IconButton>
      <Typography
        variant={isLarge ? 'h5' : 'h6'}
        sx={{ minWidth: 40, textAlign: 'center', fontWeight: 700, fontSize }}
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
          border: 1,
          borderColor: 'divider',
        }}
      >
        <AddIcon />
      </IconButton>
    </Box>
  );
}
