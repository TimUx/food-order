import { Button, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';
import { MarketingSection } from '@/components/marketing/MarketingLayout';
import { PLATFORM_BENEFITS, TARGET_GROUPS } from '@/content/platformMarketing';
import { usePlatform } from '@/contexts/PlatformProvider';

export function PlatformForClubsPage() {
  const { platform } = usePlatform();

  return (
    <PlatformPublicLayout>
      <BrandingHead titleSuffix="Für Vereine" path="/fuer-vereine" />
      <MarketingSection title="Für Vereine" subtitle="Warum FestManager entwickelt wurde – und wem es hilft.">
        <Stack spacing={4} sx={{ maxWidth: 760 }}>
          <div>
            <Typography variant="h6" fontWeight={700} gutterBottom>Warum FestManager entwickelt wurde</Typography>
            <Typography lineHeight={1.7}>
              Vereinsfeste und Veranstaltungen im Ehrenamt brauchen klare Abläufe – aber selten ein
              komplexes Enterprise-System. FestManager wurde geschaffen, um Bestellungen, Küche, Abholung
              und Auswertungen digital und verständlich zu bündeln.
            </Typography>
          </div>
          <div>
            <Typography variant="h6" fontWeight={700} gutterBottom>Welche Probleme gelöst werden</Typography>
            <Typography lineHeight={1.7}>
              Zettelwirtschaft, unübersichtliche Küchenlisten, fehlende Auswertungen und komplizierte
              Zahlungsabwicklung kosten Zeit und Nerven. FestManager strukturiert diese Prozesse und
              entlastet Helferinnen und Helfer.
            </Typography>
          </div>
          <div>
            <Typography variant="h6" fontWeight={700} gutterBottom>Für wen die Plattform geeignet ist</Typography>
            <Stack spacing={0.5}>
              {TARGET_GROUPS.map((g) => <Typography key={g}>• {g}</Typography>)}
            </Stack>
          </div>
          <div>
            <Typography variant="h6" fontWeight={700} gutterBottom>Welche Vorteile entstehen</Typography>
            <Stack spacing={0.5}>
              {PLATFORM_BENEFITS.map((b) => <Typography key={b}>• {b}</Typography>)}
            </Stack>
          </div>
          {platform.registrationEnabled && (
            <Button component={Link} to="/mandant-beantragen" variant="contained" size="large" sx={{ alignSelf: 'flex-start' }}>
              Mandant beantragen
            </Button>
          )}
        </Stack>
      </MarketingSection>
    </PlatformPublicLayout>
  );
}
