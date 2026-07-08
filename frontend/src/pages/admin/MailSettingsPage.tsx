import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { DEFAULT_EMAIL_SETTINGS, EmailSettings } from '@/types/club';

export function MailSettingsPage() {
  const { token } = useAuth();
  const [form, setForm] = useState<EmailSettings & { smtpPass: string }>({
    ...DEFAULT_EMAIL_SETTINGS,
    smtpPass: '',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token) return;
    api.getEmailSettings(token)
      .then((data) => setForm({ ...data, smtpPass: '' }))
      .catch(() => setForm({ ...DEFAULT_EMAIL_SETTINGS, smtpPass: '' }))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await api.updateEmailSettings(token, {
        smtpHost: form.smtpHost.trim() || null,
        smtpPort: form.smtpPort,
        smtpUser: form.smtpUser.trim() || null,
        smtpFrom: form.smtpFrom.trim() || null,
        emailCustomText: form.emailCustomText.trim() || null,
        ...(form.smtpPass ? { smtpPass: form.smtpPass } : {}),
      });
      setForm({ ...updated, smtpPass: '' });
      setSuccess('E-Mail-Einstellungen gespeichert');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="E-Mail-Einstellungen">
      <Typography variant="h5" fontWeight={700} gutterBottom>
        SMTP / E-Mail-Versand
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Konfigurieren Sie hier den Versand von Bestellbestätigungen. Ohne SMTP-Server erhalten Kunden keine E-Mails – Bestellungen funktionieren weiterhin.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: 3, maxWidth: 600 }}>
          <Stack spacing={2}>
            <TextField
              label="SMTP-Server (Host)"
              fullWidth
              value={form.smtpHost}
              onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
              placeholder="z. B. smtp.example.com"
              helperText="Leer lassen, um E-Mail-Versand zu deaktivieren"
            />
            <TextField
              label="Port"
              type="number"
              fullWidth
              value={form.smtpPort}
              onChange={(e) => setForm({ ...form, smtpPort: parseInt(e.target.value, 10) || 587 })}
              inputProps={{ min: 1, max: 65535 }}
              helperText="Üblich: 587 (STARTTLS) oder 465 (SSL)"
            />
            <TextField
              label="Benutzername"
              fullWidth
              value={form.smtpUser}
              onChange={(e) => setForm({ ...form, smtpUser: e.target.value })}
              autoComplete="off"
            />
            <TextField
              label="Passwort"
              type="password"
              fullWidth
              value={form.smtpPass}
              onChange={(e) => setForm({ ...form, smtpPass: e.target.value })}
              placeholder={form.smtpPassConfigured ? '••••••••' : ''}
              helperText={
                form.smtpPassConfigured
                  ? 'Leer lassen, um das gespeicherte Passwort beizubehalten'
                  : 'Nur bei Authentifizierung erforderlich'
              }
              autoComplete="new-password"
            />
            <TextField
              label="Absender-Adresse"
              type="email"
              fullWidth
              value={form.smtpFrom}
              onChange={(e) => setForm({ ...form, smtpFrom: e.target.value })}
              placeholder="noreply@ihr-verein.de"
            />
            <TextField
              label="Zusätzlicher E-Mail-Text (optional)"
              fullWidth
              multiline
              rows={4}
              value={form.emailCustomText}
              onChange={(e) => setForm({ ...form, emailCustomText: e.target.value })}
              helperText="Wird am Anfang von Bestell- und Stornierungsbestätigungen eingefügt"
              placeholder="z. B. Hinweise zur Veranstaltung oder zum Abholprozess"
            />
            <Button
              variant="contained"
              size="large"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              Speichern
            </Button>
          </Stack>
        </Paper>
      )}
    </AdminLayout>
  );
}
