import { Stack, Typography } from '@mui/material';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';
import { MarketingSection } from '@/components/marketing/MarketingLayout';

export function PlatformAboutDeveloperPage() {
  return (
    <PlatformPublicLayout>
      <BrandingHead titleSuffix="Über den Entwickler" path="/ueber-den-entwickler" />
      <MarketingSection title="Über den Entwickler" subtitle="Aus der Praxis – für Vereine und Ehrenamt.">
        <Stack spacing={3} sx={{ maxWidth: 760, lineHeight: 1.7 }}>
          <Typography>
            FestManager wird von Timo entwickelt – jemand, der Open Source schätzt, sich ehrenamtlich
            engagiert und in mehreren Vereinen aktiv ist.
          </Typography>
          <Typography>
            Die Idee zum Projekt entstand aus eigener Erfahrung: Bei Festen und Veranstaltungen fehlte
            oft eine einfache, digitale Lösung, die zu den Abläufen im Ehrenamt passt. FestManager ist
            der Versuch, genau diese Lücke zu schließen.
          </Typography>
          <Typography>
            Das Ziel ist nicht ein anonymes Produkt, sondern ein Beitrag zur Digitalisierung des Ehrenamts –
            pragmatisch, verständlich und ohne unnötigen Schnickschnack. Vereine sollen weniger Zeit mit
            Organisation verbringen und mehr Zeit für das haben, was wirklich zählt: das Fest selbst.
          </Typography>
        </Stack>
      </MarketingSection>
    </PlatformPublicLayout>
  );
}
