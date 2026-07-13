import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  Paper,
  Typography,
} from '@mui/material';
import ExtensionIcon from '@mui/icons-material/Extension';
import SaveIcon from '@mui/icons-material/Save';
import { platformApi, type TenantModuleEntitlement } from '@/services/platformApi';

interface Props {
  token: string;
  tenantId: string;
}

export function PlatformTenantModulesSection({ token, tenantId }: Props) {
  const [modules, setModules] = useState<TenantModuleEntitlement[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    platformApi
      .getTenantModules(token, tenantId)
      .then(({ modules: items }) => {
        setModules(items);
        setSelected(new Set(items.filter((m) => m.available).map((m) => m.moduleId)));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Module konnten nicht geladen werden'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, tenantId]);

  const toggle = (moduleId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const { modules: updated } = await platformApi.updateTenantModules(
        token,
        tenantId,
        [...selected]
      );
      setModules(updated);
      setSelected(new Set(updated.filter((m) => m.available).map((m) => m.moduleId)));
      setMessage('Modul-Freigaben gespeichert.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    modules.length > 0 &&
    (selected.size !== modules.filter((m) => m.available).length ||
      modules.some((m) => m.available !== selected.has(m.moduleId)));

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <ExtensionIcon color="primary" />
        <Typography variant="h6">Modul-Freigaben</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Legen Sie fest, welche installierten Module der Mandant in seiner Verwaltung aktivieren darf.
        Nicht freigegebene Module sind für den Mandanten unsichtbar.
      </Typography>

      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress size={28} />
        </Box>
      ) : modules.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Keine Module im System gefunden.
        </Typography>
      ) : (
        <Box display="flex" flexDirection="column" gap={0.5}>
          {modules.map((mod) => (
            <Box
              key={mod.moduleId}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 2,
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:last-child': { borderBottom: 0 },
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selected.has(mod.moduleId)}
                    onChange={() => toggle(mod.moduleId)}
                  />
                }
                label={
                  <Box>
                    <Typography fontWeight={600}>{mod.name}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {mod.description}
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', m: 0, flex: 1 }}
              />
              <Box display="flex" gap={0.5} flexWrap="wrap" justifyContent="flex-end">
                {mod.preview && <Chip size="small" label="Vorschau" color="warning" variant="outlined" />}
                {mod.enabled && <Chip size="small" label="Aktiv" color="success" />}
                {mod.installed && !mod.enabled && <Chip size="small" label="Installiert" variant="outlined" />}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Box mt={2}>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          onClick={() => void handleSave()}
          disabled={saving || loading || !dirty}
        >
          Freigaben speichern
        </Button>
      </Box>
    </Paper>
  );
}
