import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { Link as RouterLink } from 'react-router-dom';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import {
  platformApi,
  type PlatformUser,
  type CreatePlatformUserPayload,
  type UpdatePlatformUserPayload,
} from '@/services/platformApi';

interface UserForm {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  active: boolean;
  passwordEnabled: boolean;
  magicLinkEnabled: boolean;
}

const emptyForm: UserForm = {
  email: '',
  username: '',
  password: '',
  firstName: '',
  lastName: '',
  active: true,
  passwordEnabled: false,
  magicLinkEnabled: true,
};

export function PlatformUsersPage() {
  const { token, user: currentUser, refreshUser } = usePlatformAuth();
  const [items, setItems] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    if (!token) return;
    setLoading(true);
    platformApi.listUsers(token)
      .then((r) => setItems(r.items))
      .catch((err) => setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (user: PlatformUser) => {
    setEditingId(user.id);
    setForm({
      email: user.email,
      username: user.username ?? '',
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      active: user.active !== false,
      passwordEnabled: user.passwordEnabled ?? false,
      magicLinkEnabled: user.magicLinkEnabled ?? true,
    });
    setError('');
    setDialogOpen(true);
  };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        const payload: UpdatePlatformUserPayload = {
          email: form.email.trim(),
          username: form.username.trim() || null,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          active: form.active,
          passwordEnabled: form.passwordEnabled,
          magicLinkEnabled: form.magicLinkEnabled,
        };
        if (form.password) payload.password = form.password;
        await platformApi.updateUser(token, editingId, payload);
        if (editingId === currentUser?.id) await refreshUser();
      } else {
        const payload: CreatePlatformUserPayload = {
          email: form.email.trim(),
          username: form.username.trim() || undefined,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          passwordEnabled: form.passwordEnabled,
          magicLinkEnabled: form.magicLinkEnabled,
          ...(form.passwordEnabled ? { password: form.password } : {}),
        };
        await platformApi.createUser(token, payload);
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>Plattformadministratoren</Typography>
          <Typography color="text.secondary">
            Benutzer verwalten oder{' '}
            <RouterLink to="/platform/profil">eigenes Profil bearbeiten</RouterLink>.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Benutzer anlegen
        </Button>
      </Box>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>E-Mail</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Letzter Login</TableCell>
              <TableCell>MFA</TableCell>
              <TableCell align="right">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    Noch keine Plattformadministratoren.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  {u.firstName} {u.lastName}
                  {u.id === currentUser?.id && (
                    <Typography component="span" variant="caption" color="text.secondary"> (Sie)</Typography>
                  )}
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.active !== false ? 'Aktiv' : 'Inaktiv'}</TableCell>
                <TableCell>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('de-DE') : '–'}</TableCell>
                <TableCell>{u.mfaEnabled ? 'Vorbereitet' : '–'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => openEdit(u)} aria-label="Bearbeiten">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Benutzer bearbeiten' : 'Neuer Plattformadministrator'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{error}</Alert>}
          <TextField
            fullWidth
            label="Vorname"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Nachname"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="E-Mail"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Benutzername (optional)"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={<Switch checked={form.magicLinkEnabled} onChange={(e) => setForm({ ...form, magicLinkEnabled: e.target.checked })} />}
            label="Magic-Link-Anmeldung (Standard)"
          />
          <FormControlLabel
            control={<Switch checked={form.passwordEnabled} onChange={(e) => setForm({ ...form, passwordEnabled: e.target.checked })} />}
            label="Passwort-Anmeldung"
          />
          {form.passwordEnabled && (
            <TextField
              fullWidth
              label={editingId ? 'Neues Passwort (optional)' : 'Passwort'}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              helperText="Mindestens 8 Zeichen"
              sx={{ mb: 2, mt: 1 }}
            />
          )}
          {editingId && (
            <FormControlLabel
              control={
                <Switch
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  disabled={editingId === currentUser?.id}
                />
              }
              label="Aktiv"
            />
          )}
          {editingId === currentUser?.id && (
            <Typography variant="caption" color="text.secondary" display="block">
              Das eigene Konto kann hier nicht deaktiviert werden.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={saving || !form.firstName || !form.lastName || !form.email || (!editingId && form.password.length < 8)}
          >
            {saving ? 'Speichern…' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
