import { Button, Grid } from '@mui/material';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const;

interface NumpadProps {
  value: string;
  onChange: (value: string) => void;
}

export function Numpad({ value, onChange }: NumpadProps) {
  const press = (key: string) => {
    if (key === 'clear') {
      onChange('');
      return;
    }
    if (key === 'back') {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= 4) return;
    onChange(value + key);
  };

  return (
    <Grid container spacing={1} sx={{ maxWidth: 320, mt: 2 }}>
      {KEYS.map((key) => (
        <Grid key={key} size={{ xs: 4 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => press(key)}
            sx={{ minHeight: 56, fontSize: '1.25rem', fontWeight: 700 }}
          >
            {key === 'clear' ? 'C' : key === 'back' ? '⌫' : key}
          </Button>
        </Grid>
      ))}
    </Grid>
  );
}
