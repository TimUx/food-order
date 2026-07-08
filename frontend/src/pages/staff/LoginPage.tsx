import { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PublicLayout } from '@/components/PublicLayout';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/mitarbeiter');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout title="Mitarbeiter-Login">
      <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom align="center">
          Mitarbeiter-Login
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <TextField
              label="E-Mail"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
              autoComplete="email"
            />
            <TextField
              label="Passwort"
              type="password"
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
              disabled={loading}
            >
              Anmelden
            </Button>
          </form>
        </Paper>
      </Box>
    </PublicLayout>
  );
}
