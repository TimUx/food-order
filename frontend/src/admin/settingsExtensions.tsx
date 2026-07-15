import { Box, Button, Alert, Chip, Stack, Typography } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClub } from '@/contexts/ClubContext';
import { useTenant } from '@/contexts/TenantProvider';
import { ClubBrandColorPicker } from '@/components/ClubBrandColorPicker';
import { ClubLogoImage } from '@/components/ClubLogoImage';
import { api } from '@/services/api';

function ClubLogoExtension() {
  const { token } = useAuth();
  const { club, refresh } = useClub();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogoUpload = async (file: File) => {
    if (!token) return;
    try {
      await api.uploadClubLogo(token, file);
      await refresh();
      setSuccess('Logo hochgeladen');
      setError('');
    } catch (err) {
      setSuccess('');
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
    }
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <ClubLogoImage logoUrl={club.logoUrl} alt={club.clubName} height={80} maxWidth={200} fallback="none" />
        <Button component="label" variant="outlined" startIcon={<PhotoCameraIcon />}>
          Logo hochladen
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleLogoUpload(file);
            }}
          />
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary">
        Das Logo erscheint im öffentlichen Kopfbereich und auf der Kontaktseite, sofern hochgeladen.
      </Typography>
    </Box>
  );
}

function ClubBrandColorExtension() {
  const { token } = useAuth();
  const { tenant, refresh } = useTenant();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSelect = async (colorId: string) => {
    if (!token || colorId === tenant.theme) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.updateClubBrandColor(token, colorId);
      await refresh();
      setSuccess('Primärfarbe gespeichert');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <ClubBrandColorPicker value={tenant.theme} onChange={(colorId) => void handleSelect(colorId)} disabled={saving} />
    </Box>
  );
}

function ClubBrandingExtension() {
  return (
    <Box sx={{ mb: 2 }}>
      <ClubLogoExtension />
      <ClubBrandColorExtension />
    </Box>
  );
}

function PaymentProviderTestExtension() {
  const { token } = useAuth();
  const [testing, setTesting] = useState(false);
  const [health, setHealth] = useState<{ ok: boolean; message?: string } | null>(null);
  const [testError, setTestError] = useState('');

  const runTest = async () => {
    if (!token) return;
    setTesting(true);
    setTestError('');
    try {
      const result = await api.testPaymentProvider(token, 'stripe');
      setHealth(result);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Test fehlgeschlagen');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Stripe-Verbindung testen
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Webhook-URL: <code>/api/modules/features/payment/webhooks/stripe</code>
      </Typography>
      {testError && <Alert severity="error" sx={{ mb: 2 }}>{testError}</Alert>}
      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
        <Button size="small" variant="outlined" disabled={testing} onClick={() => void runTest()}>
          Stripe testen
        </Button>
        {health && (
          <Chip
            size="small"
            label={health.ok ? 'OK' : 'Fehler'}
            color={health.ok ? 'success' : 'warning'}
          />
        )}
        {health?.message && (
          <Typography variant="caption" color="text.secondary">{health.message}</Typography>
        )}
      </Stack>
    </Box>
  );
}

function NotificationSmtpTestExtension() {
  const { token } = useAuth();
  const [testing, setTesting] = useState(false);
  const [health, setHealth] = useState<{ ok: boolean; message?: string } | null>(null);
  const [testError, setTestError] = useState('');

  const runTest = async () => {
    if (!token) return;
    setTesting(true);
    setTestError('');
    try {
      const result = await api.testNotificationSmtp(token);
      setHealth(result);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Test fehlgeschlagen');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        SMTP-Verbindung testen
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        SMTP wird zentral in den Plattform-Einstellungen konfiguriert. Optional können hier nur Absendername und Reply-To überschrieben werden.
      </Typography>
      {testError && <Alert severity="error" sx={{ mb: 2 }}>{testError}</Alert>}
      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
        <Button size="small" variant="outlined" disabled={testing} onClick={() => void runTest()}>
          Verbindung testen
        </Button>
        {health && (
          <Chip
            size="small"
            label={health.ok ? 'OK' : 'Fehler'}
            color={health.ok ? 'success' : 'warning'}
          />
        )}
        {health?.message && (
          <Typography variant="caption" color="text.secondary">{health.message}</Typography>
        )}
      </Stack>
    </Box>
  );
}

function PrinterTestExtension() {
  const { token } = useAuth();
  const [testing, setTesting] = useState<string | null>(null);
  const [health, setHealth] = useState<Record<string, { ok: boolean; message?: string }>>({});
  const [discovered, setDiscovered] = useState<{ host: string; port: number }[]>([]);
  const [testError, setTestError] = useState('');

  const runTest = async (slotId: string) => {
    if (!token) return;
    setTesting(slotId);
    setTestError('');
    try {
      const result = await api.testPrinter(token, slotId);
      setHealth((prev) => ({ ...prev, [slotId]: result }));
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Test fehlgeschlagen');
    } finally {
      setTesting(null);
    }
  };

  const runDiscovery = async () => {
    if (!token) return;
    setTestError('');
    try {
      const result = await api.discoverPrinters(token);
      setDiscovered(result.discovered.map((d) => ({ host: d.host, port: d.port })));
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Erkennung fehlgeschlagen');
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Drucker testen &amp; erkennen
      </Typography>
      {testError && <Alert severity="error" sx={{ mb: 2 }}>{testError}</Alert>}
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 1 }}>
        {['printer1', 'printer2', 'printer3'].map((slot) => (
          <Button
            key={slot}
            size="small"
            variant="outlined"
            disabled={testing === slot}
            onClick={() => void runTest(slot)}
          >
            {slot} testen
          </Button>
        ))}
        <Button size="small" variant="outlined" onClick={() => void runDiscovery()}>
          Netzwerk scannen
        </Button>
      </Stack>
      {Object.entries(health).map(([slot, result]) => (
        <Chip
          key={slot}
          size="small"
          sx={{ mr: 1, mb: 1 }}
          label={`${slot}: ${result.ok ? 'OK' : 'Fehler'}`}
          color={result.ok ? 'success' : 'warning'}
        />
      ))}
      {discovered.length > 0 && (
        <Typography variant="caption" color="text.secondary" display="block">
          Gefunden: {discovered.map((d) => `${d.host}:${d.port}`).join(', ')}
        </Typography>
      )}
    </Box>
  );
}

export const SETTINGS_EXTENSIONS: Record<string, () => ReactNode> = {
  'core.club': () => <ClubBrandingExtension />,
  'module.payment': () => <PaymentProviderTestExtension />,
  'module.notifications': () => <NotificationSmtpTestExtension />,
  'module.printer': () => <PrinterTestExtension />,
};

export function renderSettingsExtension(namespace?: string): ReactNode {
  if (!namespace) return null;
  const Extension = SETTINGS_EXTENSIONS[namespace];
  return Extension ? <Extension /> : null;
}
