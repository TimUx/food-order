import { Accordion, AccordionDetails, AccordionSummary, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';
import { MarketingSection } from '@/components/marketing/MarketingLayout';
import { FAQ_ITEMS } from '@/content/platformMarketing';

export function PlatformFaqPage() {
  return (
    <PlatformPublicLayout>
      <BrandingHead titleSuffix="FAQ" path="/faq" />
      <MarketingSection title="Häufige Fragen" subtitle="Antworten zu Kosten, Open Source, Mandanten und Hosting.">
        {FAQ_ITEMS.map((item) => (
          <Accordion key={item.q} disableGutters elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600}>{item.q}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography color="text.secondary" lineHeight={1.7}>{item.a}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </MarketingSection>
    </PlatformPublicLayout>
  );
}
