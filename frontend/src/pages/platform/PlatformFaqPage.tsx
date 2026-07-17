import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Link as RouterLink } from 'react-router-dom';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';
import { MarketingSection } from '@/components/marketing/MarketingLayout';
import { FAQ_ITEMS } from '@/content/platformMarketing';
import { FAQ_CATEGORIES, SEO_GLOBAL_FAQS } from '@/content/seo';
import type { FaqCategoryId, SeoFaqItem } from '@/content/seo';

const LEGACY_FAQ_CATEGORY: Record<string, FaqCategoryId> = {
  'Was kostet FestSchmiede?': 'kosten-open-source',
  'Ist FestSchmiede Open Source?': 'kosten-open-source',
  'Wer darf einen Mandanten beantragen?': 'mandant-start',
  'Kann ich FestSchmiede selbst hosten?': 'technik-hosting',
  'Welche Zahlungsanbieter werden unterstützt?': 'zahlung',
  'Brauche ich technisches Know-how?': 'technik-hosting',
};

function collectFaqs(): SeoFaqItem[] {
  const seen = new Set<string>();
  const merged: SeoFaqItem[] = [];

  for (const item of [
    ...SEO_GLOBAL_FAQS,
    ...FAQ_ITEMS.map((entry) => ({
      ...entry,
      category: LEGACY_FAQ_CATEGORY[entry.q] ?? ('allgemein' as FaqCategoryId),
    })),
  ]) {
    if (seen.has(item.q)) continue;
    seen.add(item.q);
    merged.push(item);
  }

  return merged;
}

function scrollToCategory(id: FaqCategoryId) {
  const el = document.getElementById(`faq-${id}`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function PlatformFaqPage() {
  const faqs = collectFaqs();
  const grouped = FAQ_CATEGORIES.map((category) => ({
    ...category,
    items: faqs.filter((item) => item.category === category.id),
  })).filter((group) => group.items.length > 0);

  return (
    <PlatformPublicLayout>
      <BrandingHead
        titleSuffix="FAQ – Häufige Fragen zu FestSchmiede"
        description="Antworten zu Kosten, Open Source, Mandanten, Hosting, Essensbestellung, Küchenmonitor und Abholung bei FestSchmiede."
        path="/faq"
        faqs={faqs}
        breadcrumbs={[
          { name: 'Start', path: '/' },
          { name: 'FAQ', path: '/faq' },
        ]}
      />
      <MarketingSection
        title="Häufige Fragen"
        subtitle="Antworten zu Kosten, Open Source, Mandanten, Hosting und Abläufen am Vereinsfest – nach Themen gruppiert."
      >
        <Box
          component="nav"
          aria-label="FAQ-Kategorien"
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            mb: 4,
            pb: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          {grouped.map((group) => (
            <Chip
              key={group.id}
              label={`${group.title} (${group.items.length})`}
              onClick={() => scrollToCategory(group.id)}
              clickable
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Box>

        <Stack spacing={5}>
          {grouped.map((group) => (
            <Box
              key={group.id}
              id={`faq-${group.id}`}
              component="section"
              sx={{ scrollMarginTop: { xs: 88, md: 96 } }}
            >
              <Typography variant="h2" component="h2" fontWeight={800} sx={{ fontSize: { xs: '1.25rem', md: '1.45rem' }, mb: 0.5 }}>
                {group.title}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                {group.description}
              </Typography>
              {group.items.map((item) => (
                <Accordion key={item.q} disableGutters elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight={600}>{item.q}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography color="text.secondary" lineHeight={1.7}>{item.a}</Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          ))}
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
          <Button component={RouterLink} to="/themen" variant="outlined">
            Themen & Ratgeber
          </Button>
          <Button component={RouterLink} to="/kontakt" variant="contained">
            Kontakt
          </Button>
        </Stack>
      </MarketingSection>
    </PlatformPublicLayout>
  );
}
