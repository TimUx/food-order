import { Card, CardContent, Grid, Typography } from '@mui/material';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';
import { MarketingSection } from '@/components/marketing/MarketingLayout';
import { PLATFORM_FEATURES } from '@/content/platformMarketing';

export function PlatformFeaturesPage() {
  return (
    <PlatformPublicLayout>
      <BrandingHead titleSuffix="Funktionen" path="/funktionen" />
      <MarketingSection title="Funktionen" subtitle="Modular, übersichtlich und für den Veranstaltungsalltag gedacht.">
        <Grid container spacing={2}>
          {PLATFORM_FEATURES.map((f) => (
            <Grid key={f.title} size={{ xs: 12, sm: 6 }}>
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
    </PlatformPublicLayout>
  );
}
