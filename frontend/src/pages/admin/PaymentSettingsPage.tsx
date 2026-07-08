import { useState, useEffect } from 'react';
import {
  Typography, Box, Paper, Alert, CircularProgress, Switch, FormControlLabel,
  TextField, Button, Stack, Divider, Chip, Grid,
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

interface ProviderConfig {
  enabled?: boolean;
  sandbox?: boolean;
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
  clientId?: string;
  clientSecret?: string;
  merchantId?: string;
  apiKey?: string;
  portalId?: string;
  key?: string;
  merchantCode?: string;
}

interface PaymentConfig {
  defaultProvider?: string;
  onlinePaymentForEvents?: boolean;
  stripe?: ProviderConfig;
  paypal?: ProviderConfig;
  vrPayment?: ProviderConfig;
  sPayment?: ProviderConfig;
  payone?: ProviderConfig;
  sumup?: ProviderConfig;
}

const PROVIDERS = [
  { id: 'stripe', label: 'Stripe', configKey: 'stripe' as const },
  { id: 'paypal', label: 'PayPal', configKey: 'paypal' as const },
  { id: 'vr-payment', label: 'VR Payment', configKey: 'vrPayment' as const },
  { id: 's-payment', label: 'S-Payment', configKey: 'sPayment' as const },
  { id: 'payone', label: 'PAYONE', configKey: 'payone' as const },
  { id: 'sumup', label: 'SumUp', configKey: 'sumup' as const },
];

export function PaymentSettingsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [config, setConfig] = useState<PaymentConfig>({});
  const [health, setHealth] = useState<Record<string, { ok: boolean; message?: string }>>({});

  useEffect(() => {
    if (!token) return;
    void load();
  }, [token]);

  const load = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await api.getPaymentConfig(token);
      setConfig(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const updateProvider = (key: keyof PaymentConfig, field: string, value: unknown) => {
    setConfig((prev) => ({
      ...prev,
      [key]: { ...(prev[key] as ProviderConfig), [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.updatePaymentConfig(token, config as Record<string, unknown>);
      setSuccess('Einstellungen gespeichert');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (providerId: string) => {
    if (!token) return;
    setTesting(providerId);
    try {
      const result = await api.testPaymentProvider(token, providerId);
      setHealth((prev) => ({ ...prev, [providerId]: result }));
    } catch (err) {
      setHealth((prev) => ({
        ...prev,
        [providerId]: { ok: false, message: err instanceof Error ? err.message : 'Test fehlgeschlagen' },
      }));
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Payment">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Payment">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <PaymentIcon color="primary" />
        <Typography variant="h4" fontWeight={800}>Payment</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Provider konfigurieren, aktivieren und testen. Nur aktivierte Provider mit gültigen Zugangsdaten stehen für Onlinezahlungen bereit.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Stripe-Webhook-URL: <code>{`${import.meta.env.VITE_API_URL || ''}/api/modules/features/payment/webhooks/stripe`}</code>
      </Alert>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={config.onlinePaymentForEvents ?? true}
              onChange={(e) => setConfig((p) => ({ ...p, onlinePaymentForEvents: e.target.checked }))}
            />
          }
          label="Onlinezahlung für Veranstaltungen erlauben"
        />
      </Paper>

      <Stack spacing={3}>
        {PROVIDERS.map(({ id, label, configKey }) => {
          const section = (config[configKey] ?? {}) as ProviderConfig;
          const testResult = health[id];
          return (
            <Paper key={id} sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>{label}</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  {testResult && (
                    <Chip
                      label={testResult.ok ? 'OK' : 'Fehler'}
                      color={testResult.ok ? 'success' : 'error'}
                      size="small"
                    />
                  )}
                  <Button size="small" variant="outlined" disabled={testing === id} onClick={() => void handleTest(id)}>
                    {testing === id ? <CircularProgress size={18} /> : 'Testen'}
                  </Button>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={section.enabled ?? false}
                        onChange={(e) => updateProvider(configKey, 'enabled', e.target.checked)}
                      />
                    }
                    label="Aktiv"
                  />
                </Stack>
              </Stack>

              {id === 'stripe' && (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Publishable Key" fullWidth value={section.publishableKey ?? ''} onChange={(e) => updateProvider(configKey, 'publishableKey', e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Secret Key" fullWidth type="password" value={section.secretKey ?? ''} onChange={(e) => updateProvider(configKey, 'secretKey', e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Webhook Secret" fullWidth type="password" value={section.webhookSecret ?? ''} onChange={(e) => updateProvider(configKey, 'webhookSecret', e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControlLabel control={<Switch checked={section.sandbox ?? true} onChange={(e) => updateProvider(configKey, 'sandbox', e.target.checked)} />} label="Sandbox / Testmodus" />
                  </Grid>
                </Grid>
              )}

              {id !== 'stripe' && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  {label} ist als Platzhalter vorbereitet und wird in einer späteren Version vollständig implementiert.
                </Alert>
              )}

              {testResult?.message && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{testResult.message}</Typography>
              )}
            </Paper>
          );
        })}
      </Stack>

      <Divider sx={{ my: 3 }} />
      <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>
        {saving ? 'Speichern…' : 'Einstellungen speichern'}
      </Button>
    </AdminLayout>
  );
}
