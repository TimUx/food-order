import { Button, Container, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { usePlatform } from '@/contexts/PlatformProvider';
import { BrandingHead } from '@/components/BrandingHead';

export function PlatformHomePage() {
  const { platform } = usePlatform();

  return (
    <PlatformPublicLayout>
      <BrandingHead />
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
        <Typography variant="h3" fontWeight={800} gutterBottom>
          {platform.name}
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Die mandantenfähige Plattform für Vereinsfeste, Schützenfeste und Veranstaltungen.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button component={Link} to="/funktionen" variant="outlined" size="large">
            Funktionen
          </Button>
          <Button component={Link} to="/platform/login" variant="contained" size="large">
            Plattform-Login
          </Button>
        </Stack>
      </Container>
    </PlatformPublicLayout>
  );
}
