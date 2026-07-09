import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Alert, Box, CircularProgress, Container, Typography } from '@mui/material';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';
import { api } from '@/services/api';
import type { PlatformLegalPage } from '@/types/tenant';

export function PlatformDynamicLegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<PlatformLegalPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.getPlatformLegalPage(slug)
      .then(setPage)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <PlatformPublicLayout>
        <Container sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Container>
      </PlatformPublicLayout>
    );
  }

  if (notFound || !page) {
    return (
      <PlatformPublicLayout>
        <BrandingHead titleSuffix="Seite nicht gefunden" />
        <Container maxWidth="md" sx={{ py: 6 }}>
          <Alert severity="warning">Diese Seite ist nicht verfügbar.</Alert>
          <Typography sx={{ mt: 2 }}><Link to="/">Zur Startseite</Link></Typography>
        </Container>
      </PlatformPublicLayout>
    );
  }

  return (
    <PlatformPublicLayout>
      <BrandingHead titleSuffix={page.title} path={`/rechtliches/${page.slug}`} />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>{page.title}</Typography>
        <Box
          sx={{ '& a': { color: 'primary.main' }, lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: page.contentHtml }}
        />
      </Container>
    </PlatformPublicLayout>
  );
}