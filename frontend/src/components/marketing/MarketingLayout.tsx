import { Box, Container, Typography, type SxProps, type Theme } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { FestSchmiedeLogo } from '@/components/FestSchmiedeLogo';

interface MarketingSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  id?: string;
  sx?: SxProps<Theme>;
  dark?: boolean;
}

export function MarketingSection({ title, subtitle, children, id, sx, dark }: MarketingSectionProps) {
  return (
    <Box
      id={id}
      component="section"
      sx={{
        py: { xs: 5, md: 8 },
        bgcolor: dark ? 'primary.main' : 'background.default',
        color: dark ? 'primary.contrastText' : 'text.primary',
        ...sx,
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="h4" fontWeight={800} gutterBottom>
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="h6"
            sx={{ mb: 4, color: dark ? 'primary.contrastText' : 'text.secondary', fontWeight: 400, maxWidth: 720 }}
          >
            {subtitle}
          </Typography>
        )}
        {children}
      </Container>
    </Box>
  );
}

interface HeroProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
  showLogo?: boolean;
}

export function MarketingHero({ title, subtitle, children, showLogo = false }: HeroProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        py: { xs: 6, md: 10 },
        color: 'text.primary',
        backgroundImage: isDark
          ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)} 0%, ${theme.palette.background.default} 55%, ${alpha(theme.palette.secondary.main, 0.15)} 100%)`
          : 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 55%, #f3e5f5 100%)',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="lg">
        {showLogo && (
          <FestSchmiedeLogo size="hero" variant="onSurface" sx={{ mb: 3 }} />
        )}
        <Typography variant="h2" fontWeight={900} sx={{ fontSize: { xs: '2rem', md: '3rem' }, mb: 2 }}>
          {title}
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ maxWidth: 760, mb: 4, lineHeight: 1.5 }}>
          {subtitle}
        </Typography>
        {children}
      </Container>
    </Box>
  );
}

export function CtaBand({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <Box sx={{ py: { xs: 5, md: 7 }, bgcolor: 'background.paper', color: 'text.primary' }}>
      <Container maxWidth="md" sx={{ textAlign: 'center' }}>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {subtitle}
          </Typography>
        )}
        {children}
      </Container>
    </Box>
  );
}
