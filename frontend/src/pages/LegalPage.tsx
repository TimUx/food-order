import { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Paper, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { PublicLayout } from '@/components/PublicLayout';
import { api } from '@/services/api';
import type { PublicLegalPage } from '@/types/legal';

export function LegalPage() {
  const { legalSlug = '' } = useParams();
  const [page, setPage] = useState<PublicLegalPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setPage(null);
    void api.getPublicLegalPage(legalSlug)
      .then((data) => {
        if (active) setPage(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Seite konnte nicht geladen werden');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [legalSlug]);

  return (
    <PublicLayout>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error || !page ? (
        <Alert severity="warning">{error || 'Diese rechtliche Seite ist derzeit nicht verfuegbar.'}</Alert>
      ) : (
        <Paper sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            {page.title}
          </Typography>
          {page.updatedAt && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Letzte Aktualisierung: {new Date(page.updatedAt).toLocaleString('de-DE')}
            </Typography>
          )}
          <Box sx={{ '& h1, & h2, & h3, & h4': { mt: 3 }, '& table': { width: '100%', borderCollapse: 'collapse' }, '& th, & td': { border: '1px solid', borderColor: 'divider', p: 1 } }}>
            <div dangerouslySetInnerHTML={{ __html: page.html }} />
          </Box>
        </Paper>
      )}
    </PublicLayout>
  );
}
