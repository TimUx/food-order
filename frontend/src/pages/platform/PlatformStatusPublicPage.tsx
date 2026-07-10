import { Container, Typography } from '@mui/material';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';
import { usePlatform } from '@/contexts/PlatformProvider';

export function PlatformStatusPublicPage() {
  const { platform } = usePlatform();

  return (
    <PlatformPublicLayout>
      <BrandingHead titleSuffix="Status" />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Plattformstatus
        </Typography>
        <Typography paragraph>
          {platform.maintenanceMode
            ? 'Die Plattform befindet sich derzeit in Wartung.'
            : 'Alle Systeme sind betriebsbereit.'}
        </Typography>
        {platform.maintenanceMessage && (
          <Typography color="text.secondary">{platform.maintenanceMessage}</Typography>
        )}
      </Container>
    </PlatformPublicLayout>
  );
}
