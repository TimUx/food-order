import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Paper, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { AdminLayout } from '@/components/AdminLayout';
import { DynamicSettingsForm } from '@/components/DynamicSettingsForm';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantProvider';
import { api } from '@/services/api';
import type { SettingsFormDefinition, SettingsFormGroup } from '@/types/settings';
import { buildValuesPayload } from '@/types/settings';
import { renderSettingsExtension } from '@/admin/settingsExtensions';

interface GenericSettingsPageProps {
  namespace?: string;
  title?: string;
}

export function GenericSettingsPage({ namespace: nsProp, title }: GenericSettingsPageProps) {
  const { namespace: nsParam } = useParams<{ namespace: string }>();
  const namespace = decodeURIComponent(nsProp ?? nsParam ?? '');
  const { token } = useAuth();
  const { refresh: refreshTenant } = useTenant();
  const [form, setForm] = useState<SettingsFormDefinition | null>(null);
  const [groups, setGroups] = useState<SettingsFormGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token || !namespace) return;
    void load();
  }, [token, namespace]);

  const load = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await api.getSettingsForm(token, namespace);
      setForm(data);
      setGroups(data.groups);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!token || !form) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.updateSettings(token, namespace, buildValuesPayload(groups));
      setSuccess('Einstellungen gespeichert');
      await load();
      if (namespace === 'core.club') {
        await refreshTenant();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const pageTitle = title ?? form?.label ?? 'Einstellungen';

  return (
    <AdminLayout title={pageTitle}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : form ? (
        <Paper sx={{ p: 3, maxWidth: 720 }}>
          <Stack spacing={3}>
            {renderSettingsExtension(namespace)}
            <DynamicSettingsForm
              form={{ ...form, groups }}
              onChange={setGroups}
              disabled={saving}
            />
            <Box>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={() => void handleSave()}
                disabled={saving}
              >
                Speichern
              </Button>
            </Box>
          </Stack>
        </Paper>
      ) : null}
    </AdminLayout>
  );
}
