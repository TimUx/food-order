import { Container, Typography } from '@mui/material';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';
import { usePlatform } from '@/contexts/PlatformProvider';

export function PlatformDownloadPage() {
  const { platform } = usePlatform();

  return (
    <PlatformPublicLayout>
      <BrandingHead titleSuffix="Download" />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Download
        </Typography>
        <Typography paragraph>
          {platform.name} wird als Docker-Image ausgeliefert. Kontaktieren Sie Ihren Plattformadministrator
          für Zugangsdaten und Deployment-Anleitungen.
        </Typography>
        <Typography color="text.secondary">
          Aktuelle Version: {platform.version}
        </Typography>
      </Container>
    </PlatformPublicLayout>
  );
}
