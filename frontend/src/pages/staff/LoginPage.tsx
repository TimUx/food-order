import { useEffect, useState } from 'react';
import {
  Box, Paper, TextField, Button, Typography, Alert, CircularProgress,
  Tabs, Tab, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import EmailIcon from '@mui/icons-material/Email';
import PinIcon from '@mui/icons-material/Pin';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PublicLayout } from '@/components/PublicLayout';
import { api } from '@/services/api';
import { writeScopedItem } from '@/utils/storageScope';
import { useRouting } from '@/contexts/RoutingProvider';

type AuthConfig = {
  mode: string;
  passwordEnabled: boolean;
  magicLinkEnabled: boolean;
  loginCodeEnabled: boolean;
};

const TOKEN_BASE = 'verein_token';
const REFRESH_BASE = 'verein_refresh_token';

export function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [tab, setTab] = useState(0);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const { login, setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { routing } = useRouting();
  const isAdminLogin = location.pathname.startsWith('/admin');
  const loginPath = isAdminLogin ? '/admin/login' : '/mitarbeiter/login';
  const redirectPath = isAdminLogin ? '/admin' : '/mitarbeiter';
  const resetToken = searchParams.get('resetToken');

  useEffect(() => {
    api.getAuthConfig().then(setAuthConfig).catch(() => {
      setAuthConfig({ mode: 'password_or_magic', passwordEnabled: true, magicLinkEnabled: true, loginCodeEnabled: true });
    });
  }, []);

  useEffect(() => {
    if (resetToken) setResetOpen(true);
  }, [resetToken]);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;
    setLoading(true);
    api.verifyMagicLink(token)
      .then((result) => {
        setSession(result.token, result.refreshToken, result.user);
        navigate(redirectPath);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Link ungültig'))
      .finally(() => setLoading(false));
  }, [searchParams, navigate, redirectPath, setSession]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(identifier, password);
      if (isAdminLogin && user.role !== 'ADMIN') {
        setError('Nur Administratoren können sich hier anmelden.');
        return;
      }
      navigate(redirectPath);
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
      await api.requestMagicLink(identifier, loginPath);
      setInfo('Falls ein Konto existiert, wurde ein Anmeldelink an Ihre E-Mail gesendet.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anfrage fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginCodeRequest = async () => {
    if (!identifier.includes('@')) {
      setError('Für den Anmeldecode ist eine E-Mail-Adresse erforderlich.');
      return;
    }
    setLoading(true);
    setError('');
    setInfo('');
    try {
      await api.requestLoginCode(identifier);
      setInfo('Falls ein Konto existiert, wurde ein Anmeldecode an Ihre E-Mail gesendet.');
      setTab(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anfrage fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api.verifyLoginCode(identifier, code);
      writeScopedItem(TOKEN_BASE, routing.scope, routing.tenantSlug, result.token);
      if (result.refreshToken) {
        writeScopedItem(REFRESH_BASE, routing.scope, routing.tenantSlug, result.refreshToken);
      }
      setSession(result.token, result.refreshToken, result.user);
      if (isAdminLogin && result.user.role !== 'ADMIN') {
        setError('Nur Administratoren können sich hier anmelden.');
        return;
      }
      navigate(redirectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code ungültig');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setError('');
    setInfo('');
    try {
      await api.requestPasswordReset(identifier, loginPath);
      setInfo('Falls ein Konto mit Passwort-Anmeldung existiert, wurde eine E-Mail zum Zurücksetzen gesendet.');
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
      await api.resetPassword(resetToken, resetPasswordValue);
      setInfo('Passwort wurde geändert. Sie können sich jetzt anmelden.');
      setResetOpen(false);
      searchParams.delete('resetToken');
      setSearchParams(searchParams, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zurücksetzen fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const showPassword = authConfig?.passwordEnabled ?? true;
  const showMagic = authConfig?.magicLinkEnabled ?? true;
  const showCode = authConfig?.loginCodeEnabled ?? true;
  const passwordlessOnly = authConfig?.mode === 'passwordless_only';
  const identifierLabel = tab === 0 && showPassword
    ? 'Benutzername oder E-Mail'
    : 'E-Mail';

  return (
    <PublicLayout>
      <Box sx={{ maxWidth: 440, mx: 'auto', mt: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom align="center">
          {isAdminLogin ? 'Admin-Login' : 'Mitarbeiter-Login'}
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
          {passwordlessOnly ? (
            'Melden Sie sich passwortlos per E-Mail an.'
          ) : isAdminLogin ? (
            <>Mitarbeiter melden sich im <Link to="/mitarbeiter/login">Service</Link> an.</>
          ) : (
            <>Administratoren können sich im <Link to="/admin/login">Admin-Bereich</Link> anmelden.</>
          )}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {info && <Alert severity="info" sx={{ mb: 2 }}>{info}</Alert>}

        <Paper sx={{ p: 3 }}>
          <TextField
            label={identifierLabel}
            type={identifierLabel === 'E-Mail' ? 'email' : 'text'}
            fullWidth
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            sx={{ mb: 2 }}
            autoComplete="username"
          />

          {(showPassword && showMagic) || (showPassword && showCode) ? (
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
              {showPassword && <Tab label="Passwort" />}
              {showMagic && <Tab label="Magic Link" icon={<EmailIcon />} iconPosition="start" />}
              {showCode && <Tab label="Code" icon={<PinIcon />} iconPosition="start" />}
            </Tabs>
          ) : null}

          {showPassword && (tab === 0 || (!showMagic && !showCode)) && (
            <form onSubmit={handlePasswordLogin}>
              <TextField
                label="Passwort"
                type="password"
                fullWidth
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 1 }}
                autoComplete="current-password"
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button size="small" onClick={() => setForgotOpen(true)}>Passwort vergessen?</Button>
              </Box>
              <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}>
                Anmelden
              </Button>
            </form>
          )}

          {showMagic && tab === (showPassword ? 1 : 0) && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Wir senden Ihnen einen einmaligen Anmeldelink per E-Mail.
              </Typography>
              <Button variant="contained" fullWidth size="large" disabled={loading || !identifier}
                startIcon={<EmailIcon />} onClick={() => void handleMagicLink()}>
                Magic Link senden
              </Button>
            </Box>
          )}

          {showCode && tab === (showPassword ? (showMagic ? 2 : 1) : (showMagic ? 1 : 0)) && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Wir senden Ihnen einen einmaligen Anmeldecode per E-Mail.
              </Typography>
              <Button variant="outlined" fullWidth sx={{ mb: 2 }} disabled={loading || !identifier}
                onClick={() => void handleLoginCodeRequest()}>
                Code anfordern
              </Button>
              <Divider sx={{ my: 2 }} />
              <form onSubmit={handleCodeVerify}>
                <TextField label="Anmeldecode" fullWidth required value={code}
                  onChange={(e) => setCode(e.target.value)} sx={{ mb: 2 }} inputProps={{ inputMode: 'numeric' }} />
                <Button type="submit" variant="contained" fullWidth disabled={loading}>
                  Code bestätigen
                </Button>
              </form>
            </Box>
          )}
        </Paper>
      </Box>

      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Passwort vergessen</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Geben Sie Benutzername oder E-Mail ein. Sie erhalten einen Link, falls Passwort-Anmeldung für das Konto aktiv ist.
          </Typography>
          <TextField
            label="Benutzername oder E-Mail"
            fullWidth
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
          <TextField
            label="Neues Passwort"
            type="password"
            fullWidth
            margin="normal"
            value={resetPasswordValue}
            onChange={(e) => setResetPasswordValue(e.target.value)}
          />
          <TextField
            label="Passwort bestätigen"
            type="password"
            fullWidth
            margin="normal"
            value={resetConfirm}
            onChange={(e) => setResetConfirm(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={() => void handleResetPassword()} disabled={loading || !resetPasswordValue}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </PublicLayout>
  );
}
