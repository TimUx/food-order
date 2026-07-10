import { Stack, Typography } from '@mui/material';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';
import { MarketingSection } from '@/components/marketing/MarketingLayout';

export function PlatformAboutProjectPage() {
  return (
    <PlatformPublicLayout>
      <BrandingHead titleSuffix="Über das Projekt" path="/ueber-das-projekt" />
      <MarketingSection title="Über das Projekt" subtitle="FestManager – digitale Unterstützung für ehrenamtliche Veranstaltungen.">
        <Stack spacing={3} sx={{ maxWidth: 760, lineHeight: 1.7 }}>
          <Typography>
            FestManager ist eine moderne Open-Source-Plattform zur Organisation von Veranstaltungen.
            Sie unterstützt Veranstalter bei Bestellungen, Küche, Abholung, Online-Zahlungen,
            Benachrichtigungen, Auswertungen und Veranstaltungsorganisation.
          </Typography>
          <Typography>
            Das Projekt entstand aus der Erfahrung heraus, dass Vereinsfeste und ähnliche Veranstaltungen
            oft mit viel Papier, Zettelwirtschaft und manueller Koordination verbunden sind. FestManager
            soll diese Arbeit erleichtern – ohne die Eigenheiten ehrenamtlicher Organisationen zu verlieren.
          </Typography>
          <Typography>
            Die Plattform ist mandantenfähig: Jede Organisation erhält eine eigene Instanz unter einer
            Subdomain und kann Module nach Bedarf aktivieren. So bleibt FestManager überschaubar für kleine
            Feste und gleichzeitig erweiterbar für größere Veranstaltungen.
          </Typography>
        </Stack>
      </MarketingSection>
    </PlatformPublicLayout>
  );
}
