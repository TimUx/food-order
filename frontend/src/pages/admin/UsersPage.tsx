import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { User, UserRole } from '@/types';

type RolePresetId = 'vorstand' | 'eventLeitung' | 'kueche' | 'kasse' | 'abholung' | 'nurLesen';

const ROLE_PRESETS: {
  id: RolePresetId;
  label: string;
  role: UserRole;
  permissions: string[] | 'all';
}[] = [
  { id: 'vorstand', label: 'Vorstand', role: 'ADMIN', permissions: [] },
  { id: 'eventLeitung', label: 'Event-Leitung', role: 'STAFF', permissions: 'all' },
  { id: 'kueche', label: 'Küche', role: 'STAFF', permissions: ['orders.view', 'printer.print'] },
  { id: 'kasse', label: 'Kasse', role: 'STAFF', permissions: ['orders.view', 'orders.manage'] },
  { id: 'abholung', label: 'Abholung', role: 'STAFF', permissions: ['orders.view'] },
  { id: 'nurLesen', label: 'Nur-Lesen', role: 'STAFF', permissions: [] },
];

interface UserForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  active: boolean;
}

const emptyForm: UserForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: 'STAFF',
  active: true,
};

export function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [rolePreset, setRolePreset] = useState<RolePresetId | ''>('');
  const [saving, setSaving] = useState(false);

  const [availablePermissions, setAvailablePermissions] = useState<Array<{ key: string; description: string }>>([]);
  const [staffPermissions, setStaffPermissions] = useState<string[]>([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [permError, setPermError] = useState('');

  const loadUsers = () => {
    if (!token) return;
    setLoading(true);
    api.getUsers(token)
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const loadPermissions = () => {
    if (!token) return;
    setPermLoading(true);
    setPermError('');
    api.getPermissions(token)
      .then((res) => {
        setAvailablePermissions(res.available);
        setStaffPermissions(res.staff);
      })
      .catch((err) => setPermError(err.message))
      .finally(() => setPermLoading(false));
  };

  useEffect(() => {
    loadUsers();
    loadPermissions();
  }, [token]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setRolePreset('');
    setDialogOpen(true);
  };

  const applyRolePreset = (presetId: RolePresetId) => {
    const preset = ROLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setRolePreset(presetId);
    setForm((prev) => ({ ...prev, role: preset.role }));
    if (preset.role === 'STAFF') {
      const perms = preset.permissions === 'all'
        ? availablePermissions.map((p) => p.key)
        : preset.permissions;
      setStaffPermissions(perms);
    }
  };

  const openEdit = (user: User) => {
    setEditingId(user.id);
    setForm({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      active: user.active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.updateUser(token, editingId, {
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          active: form.active,
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        await api.createUser(token, {
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
        });
        if (form.role === 'STAFF' && rolePreset) {
          const preset = ROLE_PRESETS.find((p) => p.id === rolePreset);
          if (preset && preset.permissions !== 'all' && preset.permissions.length > 0) {
            await api.updateStaffPermissions(token, preset.permissions);
          } else if (preset?.permissions === 'all') {
            await api.updateStaffPermissions(token, availablePermissions.map((p) => p.key));
          }
        }
      }
      setDialogOpen(false);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const toggleStaffPermission = (key: string) => {
    setStaffPermissions((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  };

  const handleSavePermissions = async () => {
    if (!token) return;
    setPermSaving(true);
    setPermError('');
    try {
      await api.updateStaffPermissions(token, staffPermissions);
      await loadPermissions();
    } catch (err) {
      setPermError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setPermSaving(false);
    }
  };

  return (
    <AdminLayout title="Team">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Team</Typography>
          <Typography variant="body2" color="text.secondary">
            Administratoren und Mitarbeiter verwalten
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Neuer Benutzer
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>E-Mail</TableCell>
              <TableCell>Rolle</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.firstName} {user.lastName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    label={user.role === 'ADMIN' ? 'Administrator' : 'Mitarbeiter'}
                    size="small"
                    color={user.role === 'ADMIN' ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.active !== false ? 'Aktiv' : 'Inaktiv'}
                    size="small"
                    color={user.active !== false ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(user)}>
                    Bearbeiten
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Divider sx={{ my: 4 }} />

      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          Rechteverwaltung (STAFF)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Vorlagen für typische Rollen im Team. Administratoren haben immer alle Rechte.
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Button size="small" variant="outlined" onClick={() => setStaffPermissions(['printer.print'])}>
          Küche
        </Button>
        <Button size="small" variant="outlined" onClick={() => setStaffPermissions(['payment.view'])}>
          Kasse
        </Button>
        <Button size="small" variant="outlined" onClick={() => setStaffPermissions(availablePermissions.map((p) => p.key))}>
          Alle Modul-Rechte
        </Button>
      </Stack>

      {permError && <Alert severity="error" sx={{ mb: 2 }}>{permError}</Alert>}

      {permLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <FormGroup sx={{ maxHeight: 320, overflow: 'auto', pl: 1 }}>
            {availablePermissions.map((p) => (
              <FormControlLabel
                key={p.key}
                control={
                  <Checkbox
                    checked={staffPermissions.includes(p.key)}
                    onChange={() => toggleStaffPermission(p.key)}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{p.description || p.key}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.key}</Typography>
                  </Box>
                }
              />
            ))}
          </FormGroup>
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => void handleSavePermissions()} disabled={permSaving}>
              {permSaving ? 'Speichern…' : 'Rechte speichern'}
            </Button>
          </Stack>
        </>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {!editingId && (
              <FormControl fullWidth>
                <InputLabel>Rollenvorlage</InputLabel>
                <Select
                  label="Rollenvorlage"
                  value={rolePreset}
                  onChange={(e) => applyRolePreset(e.target.value as RolePresetId)}
                >
                  {ROLE_PRESETS.map((preset) => (
                    <MenuItem key={preset.id} value={preset.id}>{preset.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <TextField
              label="Vorname"
              fullWidth
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
            <TextField
              label="Nachname"
              fullWidth
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
            <TextField
              label="E-Mail"
              type="email"
              fullWidth
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <TextField
              label={editingId ? 'Neues Passwort (optional)' : 'Passwort'}
              type="password"
              fullWidth
              required={!editingId}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Rolle</InputLabel>
              <Select
                label="Rolle"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              >
                <MenuItem value="STAFF">Mitarbeiter</MenuItem>
                <MenuItem value="ADMIN">Administrator</MenuItem>
              </Select>
            </FormControl>
            {editingId && (
              <FormControlLabel
                control={
                  <Switch
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                }
                label="Benutzer aktiv"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Speichern…' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
