import { Container, Link as MuiLink, Typography } from '@mui/material';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';

export function PlatformDocsPage() {
  return (
    <PlatformPublicLayout>
      <BrandingHead titleSuffix="Dokumentation" />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Dokumentation
        </Typography>
        <Typography paragraph>
          Technische Dokumentation und Administratorhandbücher finden Sie im Projekt-Repository unter{' '}
          <MuiLink href="https://github.com" target="_blank" rel="noopener">
            docs/
          </MuiLink>
          .
        </Typography>
        <Typography color="text.secondary">
          Für Mandantenadministratoren steht nach dem Login die integrierte Hilfe im Admin-Bereich zur Verfügung.
        </Typography>
      </Container>
    </PlatformPublicLayout>
  );
}
