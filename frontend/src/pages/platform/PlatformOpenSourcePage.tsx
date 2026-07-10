import { Button, Stack, Typography } from '@mui/material';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';
import { MarketingSection } from '@/components/marketing/MarketingLayout';
import { usePlatform } from '@/contexts/PlatformProvider';

export function PlatformOpenSourcePage() {
  const { platform } = usePlatform();

  return (
    <PlatformPublicLayout>
      <BrandingHead titleSuffix="Open Source" path="/open-source" />
      <MarketingSection title="Open Source" subtitle="FestManager lebt von Transparenz, Gemeinschaft und offenem Quellcode.">
        <Stack spacing={3} sx={{ maxWidth: 760 }}>
          <Typography>
            Als Open-Source-Projekt ist FestManager für alle einsehbar. Das schafft Vertrauen,
            ermöglicht Anpassungen und verhindert Abhängigkeit von einzelnen Anbietern.
          </Typography>
          <Typography>
            <strong>Transparenz:</strong> Funktionen, Datenflüsse und Erweiterungen sind nachvollziehbar.
            Organisationen wissen, was die Plattform tut – und was nicht.
          </Typography>
          <Typography>
            <strong>Community:</strong> Feedback, Ideen und Beiträge aus der Praxis verbessern FestManager
            kontinuierlich. Mitarbeit ist ausdrücklich willkommen.
          </Typography>
          <Typography>
            <strong>GitHub:</strong> Quellcode, Issues und Dokumentation finden Sie im öffentlichen Repository.
          </Typography>
          <Button
            component="a"
            href={platform.githubUrl ?? 'https://github.com/TimUx/FestManager'}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
          >
            Zum GitHub Repository
          </Button>
        </Stack>
      </MarketingSection>
    </PlatformPublicLayout>
  );
}
