import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Grid, CircularProgress, Alert,
  FormControlLabel, Switch, MenuItem, Divider, Chip, Stack,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { platformApi } from '@/services/platformApi';

const AUTH_MODES = [
  { value: 'passwordless_only', label: 'Nur passwortlos' },
  { value: 'password_only', label: 'Nur Passwort' },
  { value: 'password_or_magic', label: 'Passwort oder Magic Link' },
  { value: 'password_and_magic', label: 'Passwort + optional Magic Link' },
];

export function PlatformMailPage() {
  const { token } = usePlatformAuth();
  const [smtp, setSmtp] = useState<Record<string, unknown>>({});
  const [auth, setAuth] = useState<Record<string, unknown>>({});
  const [queue, setQueue] = useState<{ pending: number; sent: number; failed: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [connectionResult, setConnectionResult] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    const [config, queueStatus] = await Promise.all([
      platformApi.getMailConfig(token),
      platformApi.getMailQueueStatus(token),
    ]);
    setSmtp(config.smtp);
    setAuth(config.auth);
    setQueue(queueStatus);
  };

  useEffect(() => {
    if (!token) return;
    load().finally(() => setLoading(false));
  }, [token]);

  const handleSaveSmtp = async () => {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await platformApi.updateMailSmtp(token, smtp);
      setSmtp(updated);
      setMessage({ type: 'success', text: 'SMTP-Konfiguration gespeichert' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Fehler beim Speichern' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAuth = async () => {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await platformApi.updateMailAuth(token, auth);
      setAuth(updated);
      setMessage({ type: 'success', text: 'Authentifizierungseinstellungen gespeichert' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Fehler beim Speichern' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!token) return;
    setConnectionResult(null);
    const result = await platformApi.testMailConnection(token);
    setConnectionResult(result.message);
  };

  const handleSendTest = async () => {
    if (!token || !testRecipient) return;
    setMessage(null);
    try {
      await platformApi.sendTestMail(token, testRecipient);
      setMessage({ type: 'success', text: 'Testmail wurde versendet' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Versand fehlgeschlagen' });
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EmailIcon /> E-Mail
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Zentrale SMTP-Konfiguration für alle Mandanten. Mandanten besitzen keine eigenen SMTP-Einstellungen mehr.
      </Typography>

      {message && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>SMTP-Konfiguration</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={<Switch checked={Boolean(smtp.enabled)} onChange={(e) => setSmtp({ ...smtp, enabled: e.target.checked })} />}
                  label="SMTP aktiviert"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField fullWidth label="SMTP Host" value={String(smtp.host ?? '')} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth type="number" label="Port" value={String(smtp.port ?? 587)} onChange={(e) => setSmtp({ ...smtp, port: Number(e.target.value) })} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Benutzer" value={String(smtp.user ?? '')} onChange={(e) => setSmtp({ ...smtp, user: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth type="password" label="Passwort" placeholder={smtp.passConfigured ? '••••••••' : ''} onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel control={<Switch checked={Boolean(smtp.secure)} onChange={(e) => setSmtp({ ...smtp, secure: e.target.checked })} />} label="SSL (Port 465)" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel control={<Switch checked={smtp.useTls !== false} onChange={(e) => setSmtp({ ...smtp, useTls: e.target.checked })} />} label="STARTTLS" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Absendername" value={String(smtp.senderName ?? '')} onChange={(e) => setSmtp({ ...smtp, senderName: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Absenderadresse" value={String(smtp.from ?? '')} onChange={(e) => setSmtp({ ...smtp, from: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Reply-To" value={String(smtp.replyTo ?? '')} onChange={(e) => setSmtp({ ...smtp, replyTo: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth type="number" label="Timeout (ms)" value={String(smtp.timeout ?? 30000)} onChange={(e) => setSmtp({ ...smtp, timeout: Number(e.target.value) })} />
              </Grid>
            </Grid>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button variant="contained" onClick={handleSaveSmtp} disabled={saving}>Speichern</Button>
              <Button variant="outlined" onClick={() => void handleTestConnection()}>Verbindung testen</Button>
            </Stack>
            {connectionResult && <Alert severity="info" sx={{ mt: 2 }}>{connectionResult}</Alert>}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Authentifizierung</Typography>
            <TextField
              select fullWidth label="Authentifizierungsmodus" sx={{ mb: 2 }}
              value={String(auth.mode ?? 'password_or_magic')}
              onChange={(e) => setAuth({ ...auth, mode: e.target.value })}
            >
              {AUTH_MODES.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </TextField>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth type="number" label="Magic-Link Gültigkeit (Min.)" value={String(auth.magicLinkTtlMinutes ?? 15)} onChange={(e) => setAuth({ ...auth, magicLinkTtlMinutes: Number(e.target.value) })} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth type="number" label="Login-Code Gültigkeit (Min.)" value={String(auth.loginCodeTtlMinutes ?? 10)} onChange={(e) => setAuth({ ...auth, loginCodeTtlMinutes: Number(e.target.value) })} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField fullWidth type="number" label="Code-Länge" value={String(auth.loginCodeLength ?? 6)} onChange={(e) => setAuth({ ...auth, loginCodeLength: Number(e.target.value) })} />
              </Grid>
            </Grid>
            <Button variant="contained" sx={{ mt: 2 }} onClick={handleSaveAuth} disabled={saving}>Auth-Einstellungen speichern</Button>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Testmail</Typography>
            <TextField fullWidth label="Empfänger" type="email" value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} sx={{ mb: 2 }} />
            <Button variant="contained" fullWidth onClick={() => void handleSendTest()} disabled={!testRecipient}>Testmail versenden</Button>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Mail-Queue (24h)</Typography>
            {queue ? (
              <Stack spacing={1}>
                <Chip label={`Gesendet: ${queue.sent}`} color="success" variant="outlined" />
                <Chip label={`Ausstehend: ${queue.pending}`} color="warning" variant="outlined" />
                <Chip label={`Fehlgeschlagen: ${queue.failed}`} color="error" variant="outlined" />
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="text.secondary">Gesamt: {queue.total}</Typography>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">Keine Daten</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
