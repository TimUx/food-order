import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Grid, FormControlLabel, Checkbox, CircularProgress,
} from '@mui/material';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { platformApi, type PlatformLegalPageAdmin } from '@/services/platformApi';

export function PlatformLegalAdminPage() {
  const { token } = usePlatformAuth();
  const [pages, setPages] = useState<PlatformLegalPageAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = () => {
    if (!token) return;
    platformApi.listLegalPages(token).then((r) => setPages(r.items)).finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const save = async (page: PlatformLegalPageAdmin) => {
    if (!token) return;
    setSaving(page.pageType);
    try {
      await platformApi.updateLegalPage(token, page.pageType, {
        title: page.title,
        slug: page.slug,
        enabled: page.enabled,
        published: page.published,
        contentHtml: page.contentHtml,
      });
      load();
    } finally {
      setSaving(null);
    }
  };

  const update = (pageType: string, patch: Partial<PlatformLegalPageAdmin>) => {
    setPages((prev) => prev.map((p) => (p.pageType === pageType ? { ...p, ...patch } : p)));
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Rechtliche Seiten</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Inhalte werden nur veröffentlicht, wenn Text vorhanden und „Veröffentlicht“ aktiviert ist.
        Es werden keine Mustertexte vorgegeben.
      </Typography>
      {pages.map((page) => (
        <Paper key={page.pageType} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>{page.pageType}</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Titel" value={page.title} onChange={(e) => update(page.pageType, { title: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Slug" value={page.slug} onChange={(e) => update(page.pageType, { slug: e.target.value })} />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                minRows={8}
                label="Inhalt (HTML)"
                value={page.contentHtml}
                onChange={(e) => update(page.pageType, { contentHtml: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={<Checkbox checked={page.enabled} onChange={(e) => update(page.pageType, { enabled: e.target.checked })} />}
                label="Aktiv"
              />
              <FormControlLabel
                control={<Checkbox checked={page.published} onChange={(e) => update(page.pageType, { published: e.target.checked })} />}
                label="Veröffentlicht"
              />
            </Grid>
            <Grid size={12}>
              <Button variant="contained" onClick={() => save(page)} disabled={saving === page.pageType}>
                {saving === page.pageType ? 'Speichern…' : 'Speichern'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      ))}
    </Box>
  );
}
