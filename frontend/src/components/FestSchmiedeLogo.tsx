import { Box, type SxProps, type Theme } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/** `onPrimary`: helles Logo auf farbigem/dunklem Hintergrund (AppBar primary). */
export type FestSchmiedeLogoVariant = 'onPrimary' | 'onSurface' | 'auto';

/** Vordefinierte Höhen für wiederkehrende UI-Bereiche. */
export type FestSchmiedeLogoSize = 'header' | 'drawer' | 'footer' | 'auth' | 'hero';

export const FESTSCHMIEDE_LOGO_HEIGHTS: Record<FestSchmiedeLogoSize, number> = {
  header: 48,
  drawer: 44,
  footer: 36,
  auth: 72,
  hero: 80,
};

interface FestSchmiedeLogoProps {
  /** Feste Höhe in px – überschreibt `size`. */
  height?: number;
  /** Standardgröße für Header, Menü, Footer usw. */
  size?: FestSchmiedeLogoSize;
  variant?: FestSchmiedeLogoVariant;
  sx?: SxProps<Theme>;
  alt?: string;
}

export function FestSchmiedeLogo({
  height,
  size = 'header',
  variant = 'onSurface',
  sx,
  alt = 'FestSchmiede',
}: FestSchmiedeLogoProps) {
  const theme = useTheme();
  const resolved = variant === 'auto' ? 'onSurface' : variant;
  const useLightLogo =
    resolved === 'onPrimary' ||
    (resolved === 'onSurface' && theme.palette.mode === 'dark');

  const resolvedHeight = height ?? FESTSCHMIEDE_LOGO_HEIGHTS[size];

  return (
    <Box
      component="img"
      src={useLightLogo ? '/logo-white.png' : '/logo-dark.png'}
      alt={alt}
      sx={{ height: resolvedHeight, width: 'auto', display: 'block', flexShrink: 0, ...sx }}
    />
  );
}

export const FESTSCHMIEDE_LOGO_URL = '/logo-512.png';
