import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button, Alert, Container, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import { FestSchmiedeLogo } from '@/components/FestSchmiedeLogo';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { platformApi } from '@/services/platformApi';

export function PlatformLoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const { login, setSession } = usePlatformAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const resetToken = searchParams.get('resetToken');

  useEffect(() => {
    if (resetToken) setResetOpen(true);
  }, [resetToken]);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;
    setLoading(true);
    platformApi.verifyMagicLink(token)
      .then((result) => {
        setSession(result.token, result.refreshToken, result.user);
        navigate('/platform');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Link ungültig'))
      .finally(() => setLoading(false));
  }, [searchParams, navigate, setSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      navigate('/platform');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!identifier.includes('@')) {
      setError('Für Magic Link ist eine E-Mail-Adresse erforderlich.');
      return;
    }
    setLoading(true);
    setError('');
    setInfo('');
    try {
      await platformApi.requestMagicLink(identifier);
      setInfo('Falls ein Konto existiert, wurde ein Anmeldelink gesendet.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anfrage fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setError('');
    setInfo('');
    try {
      await platformApi.requestPasswordReset(identifier);
      setInfo('Falls ein Konto mit Passwort-Anmeldung existiert, wurde eine E-Mail gesendet.');
      setForgotOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anfrage fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken) return;
    if (resetPasswordValue !== resetConfirm) {
      setError('Passwörter stimmen nicht überein');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await platformApi.resetPassword(resetToken, resetPasswordValue);
      setInfo('Passwort geändert. Sie können sich jetzt anmelden.');
      setResetOpen(false);
      searchParams.delete('resetToken');
      setSearchParams(searchParams, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zurücksetzen fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" bgcolor="#0d47a1">
      <Container maxWidth="sm">
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <FestSchmiedeLogo size="auth" variant="onPrimary" />
        </Box>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={700}>
            Plattform-Administration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Anmeldung für Plattformadministratoren
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {info && <Alert severity="info" sx={{ mb: 2 }}>{info}</Alert>}

          <TextField
            fullWidth
            label={tab === 0 ? 'Benutzername oder E-Mail' : 'E-Mail'}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            margin="normal"
            required
          />

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Passwort" />
            <Tab label="Magic Link" icon={<EmailIcon />} iconPosition="start" />
          </Tabs>

          {tab === 0 ? (
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Passwort"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="small" onClick={() => setForgotOpen(true)}>Passwort vergessen?</Button>
              </Box>
              <Button fullWidth type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 2, bgcolor: '#0d47a1' }}>
                Anmelden
              </Button>
            </form>
          ) : (
            <Button fullWidth variant="contained" size="large" disabled={loading || !identifier} onClick={() => void handleMagicLink()} sx={{ bgcolor: '#0d47a1' }}>
              Magic Link senden
            </Button>
          )}
        </Paper>
      </Container>

      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Passwort vergessen</DialogTitle>
        <DialogContent>
          <TextField
            label="Benutzername oder E-Mail"
            fullWidth
            margin="normal"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForgotOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={() => void handleForgotPassword()} disabled={loading || !identifier}>
            Link senden
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Neues Passwort setzen</DialogTitle>
        <DialogContent>
          <TextField label="Neues Passwort" type="password" fullWidth margin="normal" value={resetPasswordValue} onChange={(e) => setResetPasswordValue(e.target.value)} />
          <TextField label="Passwort bestätigen" type="password" fullWidth margin="normal" value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={() => void handleResetPassword()} disabled={loading || !resetPasswordValue}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
