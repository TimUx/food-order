import { useEffect, useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Grid, CircularProgress } from '@mui/material';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { platformApi } from '@/services/platformApi';

const SETTING_FIELDS = [
  { key: 'platform.name', label: 'Plattformname' },
  { key: 'platform.baseDomain', label: 'Basis-Domain' },
  { key: 'platform.wildcardDomain', label: 'Wildcard-Domain' },
  { key: 'platform.defaults.locale', label: 'Standard-Sprache' },
  { key: 'platform.defaults.timezone', label: 'Standard-Zeitzone' },
  { key: 'platform.defaults.currency', label: 'Standard-Währung' },
  { key: 'platform.registration.enabled', label: 'Mandantenbewerbungen (true/false)', bool: true },
  { key: 'platform.contact.name', label: 'Kontakt – Name' },
  { key: 'platform.contact.email', label: 'Kontakt – E-Mail' },
  { key: 'platform.contact.phone', label: 'Kontakt – Telefon' },
  { key: 'platform.contact.address', label: 'Kontakt – Adresse' },
  { key: 'platform.contact.website', label: 'Kontakt – Website' },
  { key: 'platform.links.github', label: 'GitHub URL' },
  { key: 'platform.maintenance.enabled', label: 'Wartungsmodus (true/false)', bool: true },
  { key: 'platform.maintenance.message', label: 'Wartungsnachricht' },
  { key: 'platform.branding.primaryColor', label: 'Primärfarbe' },
  { key: 'platform.branding.footerText', label: 'Footer-Text' },
];

export function PlatformSettingsPage() {
  const { token } = usePlatformAuth();
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    platformApi.getSettings(token).then(setSettings).finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const updated = await platformApi.updateSettings(token, settings);
      setSettings(updated);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Plattform-Einstellungen</Typography>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          {SETTING_FIELDS.map((f) => (
            <Grid size={{ xs: 12, md: 6 }} key={f.key}>
              <TextField
                fullWidth
                label={f.label}
                value={String(settings[f.key] ?? '')}
                onChange={(e) => {
                  let val: unknown = e.target.value;
                  if (f.bool) val = e.target.value === 'true';
                  setSettings({ ...settings, [f.key]: val });
                }}
              />
            </Grid>
          ))}
        </Grid>
        <Button variant="contained" sx={{ mt: 2 }} onClick={handleSave} disabled={saving}>
          Speichern
        </Button>
      </Paper>
    </Box>
  );
}
