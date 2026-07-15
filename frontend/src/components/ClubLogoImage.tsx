import { Box } from '@mui/material';
import { FestSchmiedeLogo } from '@/components/FestSchmiedeLogo';
import { getImageUrl } from '@/services/api';

interface ClubLogoImageProps {
  logoUrl?: string | null;
  alt: string;
  height?: number;
  maxWidth?: number;
  fallback?: 'festschmiede' | 'none';
  festSchmiedeVariant?: 'onPrimary' | 'onSurface';
}

export function ClubLogoImage({
  logoUrl,
  alt,
  height = 48,
  maxWidth = 160,
  fallback = 'festschmiede',
  festSchmiedeVariant = 'onPrimary',
}: ClubLogoImageProps) {
  const resolvedUrl = getImageUrl(logoUrl || undefined);

  if (resolvedUrl) {
    return (
      <Box
        component="img"
        src={resolvedUrl}
        alt={alt}
        sx={{
          height,
          maxWidth,
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0,
        }}
      />
    );
  }

  if (fallback === 'festschmiede') {
    return <FestSchmiedeLogo size="header" variant={festSchmiedeVariant} />;
  }

  return null;
}
