import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import {
  DEFAULT_TENANT_BRAND_COLOR_ID,
  TENANT_BRAND_PALETTE,
  normalizeTenantBrandColorId,
} from '@/utils/tenantBrandPalette';

interface ClubBrandColorPickerProps {
  value?: string | null;
  onChange: (colorId: string) => void;
  disabled?: boolean;
}

export function ClubBrandColorPicker({ value, onChange, disabled }: ClubBrandColorPickerProps) {
  const selectedId = normalizeTenantBrandColorId(value ?? DEFAULT_TENANT_BRAND_COLOR_ID);

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Primärfarbe
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Wird für Buttons, Links, Rahmen und den Kopfbereich verwendet. Nur Farben mit gut lesbarer heller Schrift.
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
          gap: 1.5,
          maxWidth: 640,
        }}
      >
        {TENANT_BRAND_PALETTE.map((color) => {
          const selected = color.id === selectedId;
          return (
            <ButtonBase
              key={color.id}
              onClick={() => onChange(color.id)}
              disabled={disabled}
              aria-label={`${color.label} wählen`}
              aria-pressed={selected}
              sx={{
                borderRadius: 2,
                p: 1,
                border: 2,
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: 'background.paper',
                opacity: disabled ? 0.6 : 1,
              }}
            >
              <Stack spacing={0.75} alignItems="center" sx={{ width: '100%' }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: color.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  {selected ? <CheckIcon fontSize="small" /> : null}
                </Box>
                <Typography variant="caption" textAlign="center" lineHeight={1.2}>
                  {color.label}
                </Typography>
              </Stack>
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}
