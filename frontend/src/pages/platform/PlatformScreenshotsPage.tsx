import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';
import { MarketingSection } from '@/components/marketing/MarketingLayout';
import { SCREENSHOTS } from '@/content/platformMarketing';

export function PlatformScreenshotsPage() {
  return (
    <PlatformPublicLayout>
      <BrandingHead titleSuffix="Screenshots" description="Screenshots der FestManager Plattform – Dashboard, Bestellung, Küche, Zahlungen und mehr." path="/screenshots" />
      <MarketingSection title="Screenshots" subtitle="Einblicke in Dashboard, Bestellung, Küche, Zahlungen, Administration und Module.">
        <Grid container spacing={3}>
          {SCREENSHOTS.map((s) => (
            <Grid key={s.src} size={{ xs: 12, md: 6 }}>
              <Card>
                <Box
                  component="img"
                  src={s.src}
                  alt={s.alt}
                  sx={{ width: '100%', display: 'block' }}
                  loading="lazy"
                />
                <CardContent>
                  <Typography variant="h6" fontWeight={700}>{s.title}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </MarketingSection>
    </PlatformPublicLayout>
  );
}