import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Paper,
  Switch,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

export function AdminProfilePage() {
  const { token, user, setSession } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [magicLinkEnabled, setMagicLinkEnabled] = useState(true);
  const [notificationEmailsEnabled, setNotificationEmailsEnabled] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email ?? '');
    setUsername(user.username ?? '');
    setPasswordEnabled(user.passwordEnabled ?? false);
    setMagicLinkEnabled(user.magicLinkEnabled ?? true);
    setNotificationEmailsEnabled(user.notificationEmailsEnabled ?? false);
  }, [user]);

  const save = async () => {
    if (!token) return;
    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Neue Passwörter stimmen nicht überein' });
      return;
    }
    if (magicLinkEnabled && !email.trim()) {
      setMessage({ type: 'error', text: 'Magic-Link-Anmeldung erfordert eine E-Mail-Adresse' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.updateProfile(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        username: username.trim() || null,
        passwordEnabled,
        magicLinkEnabled,
        notificationEmailsEnabled,
        ...(currentPassword ? { currentPassword } : {}),
        ...(newPassword ? { newPassword } : {}),
      });
      const refreshToken = localStorage.getItem('verein_refresh_token');
      setSession(token, refreshToken ?? undefined, updated);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: 'Profil gespeichert' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Speichern fehlgeschlagen' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <CircularProgress />;

  return (
    <AdminLayout title="Mein Profil">
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Persönliche Daten und Anmeldemethoden für Ihr Administrator-Konto.
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Paper sx={{ p: 3, maxWidth: 560 }}>
        <TextField label="Vorname" fullWidth margin="normal" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <TextField label="Nachname" fullWidth margin="normal" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <TextField label="E-Mail" type="email" fullWidth margin="normal" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label="Benutzername (optional)"
          fullWidth
          margin="normal"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          helperText="Alternativ zur E-Mail für die Passwort-Anmeldung"
        />

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" fontWeight={600}>Anmeldemethoden</Typography>
        <FormControlLabel
          control={<Switch checked={magicLinkEnabled} onChange={(e) => setMagicLinkEnabled(e.target.checked)} />}
          label="Magic-Link-Anmeldung"
        />
        <FormControlLabel
          control={<Switch checked={passwordEnabled} onChange={(e) => setPasswordEnabled(e.target.checked)} />}
          label="Passwort-Anmeldung"
        />

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" fontWeight={600}>Benachrichtigungen</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          E-Mails zu Bestellungen, Stornierungen, Zahlungen und weiteren Ereignissen dieses Mandanten.
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={notificationEmailsEnabled}
              onChange={(e) => setNotificationEmailsEnabled(e.target.checked)}
              disabled={!email.trim()}
            />
          }
          label="E-Mail-Benachrichtigungen erhalten"
        />
        {!email.trim() && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mt: -0.5 }}>
            Bitte zuerst eine E-Mail-Adresse hinterlegen.
          </Typography>
        )}

        {passwordEnabled && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" fontWeight={600}>Passwort ändern</Typography>
            <TextField label="Aktuelles Passwort" type="password" fullWidth margin="normal" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <TextField label="Neues Passwort" type="password" fullWidth margin="normal" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <TextField label="Neues Passwort bestätigen" type="password" fullWidth margin="normal" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </>
        )}

        <Box sx={{ mt: 3 }}>
          <Button variant="contained" onClick={() => void save()} disabled={saving}>
            {saving ? 'Speichern…' : 'Speichern'}
          </Button>
        </Box>
      </Paper>
    </AdminLayout>
  );
}
