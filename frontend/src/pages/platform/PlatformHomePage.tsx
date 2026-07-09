import { Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';
import { MarketingHero, MarketingSection, CtaBand } from '@/components/marketing/MarketingLayout';
import { usePlatform } from '@/contexts/PlatformProvider';
import { PLATFORM_BENEFITS, PLATFORM_FEATURES, SCREENSHOTS, TARGET_GROUPS } from '@/content/platformMarketing';

export function PlatformHomePage() {
  const { platform } = usePlatform();

  return (
    <PlatformPublicLayout>
      <BrandingHead
        description="FestManager ist eine moderne Open-Source-Plattform zur Organisation von Veranstaltungen für Vereine und gemeinnützige Organisationen."
      />
      <MarketingHero
        title="Veranstaltungen organisieren – einfach, digital, gemeinschaftlich"
        subtitle="FestManager ist eine moderne Open-Source-Plattform zur Organisation von Veranstaltungen. Sie unterstützt Veranstalter bei Bestellungen, Küche, Abholung, Online-Zahlungen, Benachrichtigungen, Auswertungen und Veranstaltungsorganisation."
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button component={Link} to="/funktionen" variant="contained" size="large">
            Funktionen entdecken
          </Button>
          {platform.registrationEnabled ? (
            <Button component={Link} to="/mandant-beantragen" variant="outlined" size="large">
              Mandant beantragen
            </Button>
          ) : (
            <Button component={Link} to="/kontakt" variant="outlined" size="large">
              Kontakt aufnehmen
            </Button>
          )}
        </Stack>
      </MarketingHero>

      <MarketingSection
        title="Was ist FestManager?"
        subtitle="FestManager wurde insbesondere für Vereine und gemeinnützige Organisationen entwickelt, eignet sich jedoch ebenso für Schulen, Feuerwehren, Hilfsorganisationen, Kommunen und kleinere Veranstaltungen."
      >
        <Typography sx={{ maxWidth: 800, lineHeight: 1.7 }}>
          Ob Schützenfest, Vereinsabend oder Spendenaktion – FestManager bündelt Bestellungen, Küchenabläufe,
          Abholung und Auswertungen in einer übersichtlichen Plattform. Jede Organisation kann als eigener Mandant
          arbeiten und nur die Module nutzen, die wirklich gebraucht werden.
        </Typography>
      </MarketingSection>

      <MarketingSection title="Wichtigste Funktionen" subtitle="Alles, was Veranstalter im Alltag brauchen – modular und erweiterbar.">
        <Grid container spacing={2}>
          {PLATFORM_FEATURES.map((f) => (
            <Grid key={f.title} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} gutterBottom>{f.title}</Typography>
                  <Typography color="text.secondary">{f.description}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </MarketingSection>

      <MarketingSection title="Einblicke in die Plattform" subtitle="Aktuelle Screenshots aus FestManager.">
        <Grid container spacing={2}>
          {SCREENSHOTS.slice(0, 3).map((s) => (
            <Grid key={s.src} size={{ xs: 12, md: 4 }}>
              <Card>
                <Box
                  component="img"
                  src={s.src}
                  alt={s.alt}
                  sx={{ width: '100%', display: 'block', borderBottom: 1, borderColor: 'divider' }}
                  loading="lazy"
                />
                <CardContent>
                  <Typography fontWeight={600}>{s.title}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Button component={Link} to="/screenshots" sx={{ mt: 3 }}>
          Alle Screenshots ansehen
        </Button>
      </MarketingSection>

      <MarketingSection title="Vorteile" subtitle="Warum FestManager für ehrenamtliche Veranstaltungen passt.">
        <Grid container spacing={1}>
          {PLATFORM_BENEFITS.map((b) => (
            <Grid key={b} size={{ xs: 12, md: 6 }}>
              <Typography sx={{ py: 0.5 }}>• {b}</Typography>
            </Grid>
          ))}
        </Grid>
      </MarketingSection>

      <MarketingSection title="Zielgruppen">
        <Stack spacing={1}>
          {TARGET_GROUPS.map((g) => (
            <Typography key={g}>• {g}</Typography>
          ))}
        </Stack>
      </MarketingSection>

      <MarketingSection title="Open Source" subtitle="Transparent, erweiterbar und unabhängig.">
        <Typography sx={{ maxWidth: 760, mb: 2, lineHeight: 1.7 }}>
          FestManager ist Open Source. Der Quellcode ist einsehbar, Mitarbeit ist willkommen und Organisationen
          bleiben unabhängig von einzelnen Anbietern.
        </Typography>
        <Button
          component="a"
          href={platform.githubUrl ?? 'https://github.com/TimUx/FestManager'}
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
        >
          GitHub Repository
        </Button>
      </MarketingSection>

      <CtaBand
        title="Bereit für Ihr nächstes Fest?"
        subtitle="Stellen Sie eine Mandantenbewerbung oder informieren Sie sich über Self-Hosting und Funktionen."
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
          {platform.registrationEnabled && (
            <Button component={Link} to="/mandant-beantragen" variant="contained" size="large">
              Mandant beantragen
            </Button>
          )}
          <Button component={Link} to="/fuer-vereine" variant="outlined" size="large">
            Für Vereine
          </Button>
        </Stack>
      </CtaBand>
    </PlatformPublicLayout>
  );
}