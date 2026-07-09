import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button, Alert, Container,
} from '@mui/material';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';

export function PlatformLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = usePlatformAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/platform');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" bgcolor="#0d47a1">
      <Container maxWidth="sm">
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight={700}>
            Plattform-Administration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Anmeldung für Plattformadministratoren
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="E-Mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} margin="normal" required />
            <TextField fullWidth label="Passwort" type="password" value={password} onChange={(e) => setPassword(e.target.value)} margin="normal" required />
            <Button fullWidth type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 2, bgcolor: '#0d47a1' }}>
              Anmelden
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
