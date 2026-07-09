import { Alert, Button, Typography } from '@mui/material';
import { Link, useSearchParams } from 'react-router-dom';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';
import { MarketingSection } from '@/components/marketing/MarketingLayout';

export function PlatformApplyConfirmPage() {
  const [params] = useSearchParams();
  const id = params.get('id');

  return (
    <PlatformPublicLayout>
      <BrandingHead titleSuffix="Bewerbung eingegangen" path="/mandant-beantragen/bestaetigung" />
      <MarketingSection title="Vielen Dank für Ihre Bewerbung">
        <Alert severity="success" sx={{ mb: 3 }}>
          Ihre Mandantenbewerbung wurde erfolgreich übermittelt.
          {id && <> Referenz: {id}</>}
        </Alert>
        <Typography sx={{ mb: 3, maxWidth: 640, lineHeight: 1.7 }}>
          Wir haben Ihre Angaben erhalten und senden Ihnen eine Bestätigung per E-Mail,
          sofern der Versand konfiguriert ist. Unser Team prüft Ihre Bewerbung und meldet sich bei Ihnen.
        </Typography>
        <Button component={Link} to="/" variant="contained">
          Zur Startseite
        </Button>
      </MarketingSection>
    </PlatformPublicLayout>
  );
}
