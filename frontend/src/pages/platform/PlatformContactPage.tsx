import { Alert, Stack, Typography } from '@mui/material';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';
import { MarketingSection } from '@/components/marketing/MarketingLayout';
import { usePlatform } from '@/contexts/PlatformProvider';

export function PlatformContactPage() {
  const { platform } = usePlatform();
  const hasContact = platform.contactEmail || platform.contactPhone || platform.contactName || platform.contactAddress;

  return (
    <PlatformPublicLayout>
      <BrandingHead titleSuffix="Kontakt" path="/kontakt" />
      <MarketingSection title="Kontakt" subtitle="So erreichen Sie die FestManager-Plattform.">
        {hasContact ? (
          <Stack spacing={2} sx={{ maxWidth: 560 }}>
            {platform.contactName && <Typography><strong>Ansprechpartner:</strong> {platform.contactName}</Typography>}
            {platform.contactEmail && (
              <Typography>
                <strong>E-Mail:</strong>{' '}
                <a href={`mailto:${platform.contactEmail}`}>{platform.contactEmail}</a>
              </Typography>
            )}
            {platform.contactPhone && <Typography><strong>Telefon:</strong> {platform.contactPhone}</Typography>}
            {platform.contactAddress && <Typography><strong>Adresse:</strong> {platform.contactAddress}</Typography>}
            {platform.website && (
              <Typography>
                <strong>Website:</strong>{' '}
                <a href={platform.website} target="_blank" rel="noopener noreferrer">{platform.website}</a>
              </Typography>
            )}
          </Stack>
        ) : (
          <Alert severity="info">
            Kontaktdaten werden über die Plattform-Einstellungen gepflegt. Bitte wenden Sie sich an den Plattformadministrator.
          </Alert>
        )}
      </MarketingSection>
    </PlatformPublicLayout>
  );
}
