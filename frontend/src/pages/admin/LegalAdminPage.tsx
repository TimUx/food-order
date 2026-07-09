import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import PreviewIcon from '@mui/icons-material/Preview';
import ArticleIcon from '@mui/icons-material/Article';
import SettingsIcon from '@mui/icons-material/Settings';
import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { DynamicSettingsForm } from '@/components/DynamicSettingsForm';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { buildValuesPayload, type SettingsFormDefinition, type SettingsFormGroup } from '@/types/settings';
import type { AdminLegalPage, LegalModuleConfig, LegalPageType } from '@/types/legal';

const PAGE_ORDER: LegalPageType[] = ['imprint', 'privacy', 'terms', 'withdrawal'];
const TAB_IDS = ['overview', 'pages', 'settings', 'preview'] as const;
type LegalTab = (typeof TAB_IDS)[number];

const PAGE_TYPE_LABELS: Record<LegalPageType, string> = {
  imprint: 'Impressum',
  privacy: 'Datenschutz',
  terms: 'AGB',
  withdrawal: 'Widerruf',
};

function visibilityChip(page: AdminLegalPage) {
  if (page.isPubliclyVisible) return <Chip color="success" size="small" label="Oeffentlich sichtbar" />;
  if (!page.hasContent) return <Chip color="warning" size="small" label="Kein Inhalt" />;
  return <Chip variant="outlined" size="small" label="Nicht veroeffentlicht" />;
}

export function LegalAdminPage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as LegalTab) || 'overview';
  const [pages, setPages] = useState<AdminLegalPage[]>([]);
  const [selectedType, setSelectedType] = useState<LegalPageType>('imprint');
  const [draft, setDraft] = useState<AdminLegalPage | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [settingsForm, setSettingsForm] = useState<SettingsFormDefinition | null>(null);
  const [settingsGroups, setSettingsGroups] = useState<SettingsFormGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPages = useCallback(async () => {
    if (!token) return;
    const data = await api.getLegalPages(token);
    setPages(data);
    const current = data.find((page) => page.pageType === selectedType) ?? data[0] ?? null;
    setDraft(current ? { ...current } : null);
  }, [token, selectedType]);

  const loadSettings = useCallback(async () => {
    if (!token) return;
    const values = await api.getModuleConfig(token, 'legal') as unknown as LegalModuleConfig;
    const generatedForm: SettingsFormDefinition = {
      namespace: 'module.legal',
      label: 'Rechtliche Informationen',
      groups: [
        {
          id: 'general',
          label: 'Allgemein',
          fields: [
            {
              key: 'appendClubContactToImprint',
              group: 'general',
              label: 'Kontaktinformationen automatisch im Impressum ergaenzen',
              type: 'boolean',
              value: values.appendClubContactToImprint,
            },
            {
              key: 'showFooterLinks',
              group: 'general',
              label: 'Veroeffentlichte Seiten im Footer der Bestellseite anzeigen',
              type: 'boolean',
              value: values.showFooterLinks,
            },
            {
              key: 'showNotificationLinks',
              group: 'general',
              label: 'Veroeffentlichte Seiten in Benachrichtigungs-E-Mails verlinken',
              type: 'boolean',
              value: values.showNotificationLinks,
            },
          ],
        },
      ],
    };

    setSettingsForm(generatedForm);
    setSettingsGroups(generatedForm.groups);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void Promise.all([loadPages(), loadSettings()])
      .catch((err) => setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen'))
      .finally(() => setLoading(false));
  }, [token, loadPages, loadSettings]);

  useEffect(() => {
    const page = pages.find((entry) => entry.pageType === selectedType) ?? null;
    setDraft(page ? { ...page } : null);
  }, [pages, selectedType]);

  const publishedCount = useMemo(
    () => pages.filter((page) => page.isPubliclyVisible).length,
    [pages]
  );

  const setTab = (next: LegalTab) => setSearchParams({ tab: next });

  const savePage = async () => {
    if (!token || !draft) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.updateLegalPage(token, draft.pageType, draft);
      await loadPages();
      setSuccess('Seite gespeichert');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const loadPreview = async () => {
    if (!token || !draft) return;
    try {
      const data = await api.previewLegalPage(token, draft.pageType, draft.contentHtml);
      setPreviewHtml(data.html);
      setTab('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vorschau konnte nicht geladen werden');
    }
  };

  const saveSettings = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.updateModuleConfig(token, 'legal', buildValuesPayload(settingsGroups));
      setSuccess('Einstellungen gespeichert');
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  if (!token) return null;

  return (
    <AdminLayout title="Rechtliche Informationen" fullWidth>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <GavelIcon color="primary" />
        <Typography variant="h5" fontWeight={800}>Rechtliche Informationen</Typography>
      </Stack>

      <Alert severity="warning" sx={{ mb: 3 }}>
        Dieses Modul stellt nur die technische Infrastruktur bereit. Inhalte muessen vom Verein selbst gepflegt, regelmaessig geprueft und rechtlich eigenverantwortlich bewertet werden. Die Plattform bietet keine Rechtsberatung.
      </Alert>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value as LegalTab)} variant="scrollable" scrollButtons="auto">
          <Tab value="overview" label="Uebersicht" />
          <Tab value="pages" label="Seiten" />
          <Tab value="settings" label="Einstellungen" />
          <Tab value="preview" label="Vorschau" />
        </Tabs>
      </Box>

      {loading ? (
        <Typography>Lade Daten…</Typography>
      ) : tab === 'overview' ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary">Veroeffentlicht</Typography>
              <Typography variant="h4" fontWeight={800}>{publishedCount}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Seitenstatus</Typography>
              <Stack spacing={1.5}>
                {pages.map((page) => (
                  <Box key={page.pageType} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Typography>{PAGE_TYPE_LABELS[page.pageType]}</Typography>
                    {visibilityChip(page)}
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      ) : tab === 'pages' ? (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Paper sx={{ p: 2 }}>
              <Stack spacing={1}>
                {PAGE_ORDER.map((pageType) => {
                  const page = pages.find((entry) => entry.pageType === pageType);
                  return (
                    <Button
                      key={pageType}
                      variant={selectedType === pageType ? 'contained' : 'outlined'}
                      onClick={() => setSelectedType(pageType)}
                      sx={{ justifyContent: 'space-between' }}
                    >
                      {PAGE_TYPE_LABELS[pageType]}
                      {page?.isPubliclyVisible ? ' •' : ''}
                    </Button>
                  );
                })}
              </Stack>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 9 }}>
            {draft && (
              <Paper sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Titel"
                      fullWidth
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    />
                    <TextField
                      label="URL"
                      fullWidth
                      value={draft.slug}
                      onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                      helperText={`Oeffentlich unter /${draft.slug}`}
                    />
                  </Stack>

                  <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Switch
                        checked={draft.enabled}
                        onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                      />
                      <Typography>Aktiviert</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Switch
                        checked={draft.published}
                        onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                      />
                      <Typography>Veröffentlicht</Typography>
                    </Stack>
                    {visibilityChip(draft)}
                  </Stack>

                  <TextField
                    label="HTML-Inhalt"
                    multiline
                    minRows={16}
                    fullWidth
                    value={draft.contentHtml}
                    onChange={(e) => setDraft({ ...draft, contentHtml: e.target.value })}
                    helperText="Erlaubt sind u. a. Ueberschriften, Listen, Tabellen, Links, Fett, Kursiv und Absaetze. Der Inhalt wird serverseitig sanitizt."
                  />

                  <Alert severity="info">
                    Leere Seiten werden niemals oeffentlich angezeigt, selbst wenn sie aktiviert und veroeffentlicht sind.
                  </Alert>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Button variant="contained" startIcon={<ArticleIcon />} onClick={() => void savePage()} disabled={saving}>
                      {saving ? 'Speichern…' : 'Seite speichern'}
                    </Button>
                    <Button variant="outlined" startIcon={<PreviewIcon />} onClick={() => void loadPreview()}>
                      Vorschau aktualisieren
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            )}
          </Grid>
        </Grid>
      ) : tab === 'settings' ? (
        <Paper sx={{ p: 3, maxWidth: 820 }}>
          {settingsForm && (
            <>
              <DynamicSettingsForm form={{ ...settingsForm, groups: settingsGroups }} onChange={setSettingsGroups} />
              <Divider sx={{ my: 2 }} />
              <Button variant="contained" startIcon={<SettingsIcon />} onClick={() => void saveSettings()} disabled={saving}>
                {saving ? 'Speichern…' : 'Einstellungen speichern'}
              </Button>
            </>
          )}
        </Paper>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Vorschau {draft ? `- ${PAGE_TYPE_LABELS[draft.pageType]}` : ''}
          </Typography>
          {previewHtml ? (
            <Box sx={{ '& h1, & h2, & h3, & h4': { mt: 3 }, '& table': { width: '100%', borderCollapse: 'collapse' }, '& th, & td': { border: '1px solid', borderColor: 'divider', p: 1 } }}>
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </Box>
          ) : (
            <Typography color="text.secondary">Noch keine Vorschau geladen.</Typography>
          )}
        </Paper>
      )}
    </AdminLayout>
  );
}
