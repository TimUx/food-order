import { Container, Typography } from '@mui/material';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';

export function PlatformLegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PlatformPublicLayout>
      <BrandingHead titleSuffix={title} />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        {children}
      </Container>
    </PlatformPublicLayout>
  );
}

export function PlatformImpressumPage() {
  return (
    <PlatformLegalPage title="Impressum">
      <Typography color="text.secondary">
        Angaben gemäß § 5 TMG werden vom Plattformbetreiber bereitgestellt.
        Bitte wenden Sie sich an den FestManager-Plattformadministrator.
      </Typography>
    </PlatformLegalPage>
  );
}

export function PlatformDatenschutzPage() {
  return (
    <PlatformLegalPage title="Datenschutz">
      <Typography color="text.secondary">
        Informationen zur Verarbeitung personenbezogener Daten auf Plattformebene
        werden vom Plattformbetreiber bereitgestellt.
      </Typography>
    </PlatformLegalPage>
  );
}
