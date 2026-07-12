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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SecurityIcon from '@mui/icons-material/Security';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { User, UserRole, RoleTemplate, RoleTemplateId } from '@/types';

interface UserForm {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  active: boolean;
  roleTemplate: RoleTemplateId | '';
  passwordEnabled: boolean;
  magicLinkEnabled: boolean;
}

const emptyForm: UserForm = {
  username: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: 'STAFF',
  active: true,
  roleTemplate: 'kueche',
  passwordEnabled: true,
  magicLinkEnabled: false,
};

const TEMPLATE_LABELS: Record<string, string> = {
  kueche: 'Küche',
  abholung: 'Abholung',
  kasse: 'Kasse',
  speisenpflege: 'Speisenpflege',
  finanzen: 'Finanzen',
  rechtliches: 'Rechtliches',
};

function displayRole(user: User): string {
  if (user.role === 'ADMIN') return 'Administrator';
  if (user.roleTemplate && TEMPLATE_LABELS[user.roleTemplate]) {
    return TEMPLATE_LABELS[user.roleTemplate];
  }
  return 'Mitarbeiter';
}

export function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [permUserId, setPermUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [selectedTemplate, setSelectedTemplate] = useState<RoleTemplateId | ''>('kueche');
  const [saving, setSaving] = useState(false);

  const loadUsers = () => {
    if (!token) return;
    setLoading(true);
    api.getUsers(token)
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const loadTemplates = () => {
    if (!token) return;
    api.getPermissions(token)
      .then((res) => setTemplates(res.templates ?? []))
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    loadUsers();
    loadTemplates();
  }, [token]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleRoleChange = (role: UserRole) => {
    if (role === 'ADMIN') {
      setForm((prev) => ({
        ...prev,
        role,
        passwordEnabled: false,
        magicLinkEnabled: true,
        password: '',
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        role,
        passwordEnabled: true,
        magicLinkEnabled: Boolean(prev.email.trim()),
      }));
    }
  };

  const openEdit = (user: User) => {
    setEditingId(user.id);
    setForm({
      email: user.email ?? '',
      username: user.username ?? '',
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      active: user.active ?? true,
      roleTemplate: (user.roleTemplate as RoleTemplateId) ?? '',
      passwordEnabled: user.passwordEnabled ?? false,
      magicLinkEnabled: user.magicLinkEnabled ?? true,
    });
    setDialogOpen(true);
  };

  const openPermissions = (user: User) => {
    setPermUserId(user.id);
    setSelectedTemplate((user.roleTemplate as RoleTemplateId) ?? 'kueche');
    setPermDialogOpen(true);
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.updateUser(token, editingId, {
          email: form.email.trim() || null,
          username: form.username.trim() || null,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          active: form.active,
          passwordEnabled: form.passwordEnabled,
          magicLinkEnabled: form.magicLinkEnabled,
          ...(form.password ? { password: form.password } : {}),
        });
        if (form.role === 'STAFF' && form.roleTemplate) {
          const template = templates.find((t) => t.id === form.roleTemplate);
          if (template) {
            await api.updateUserPermissions(token, editingId, {
              permissions: template.permissions,
              roleTemplate: template.id,
            });
          }
        }
      } else {
        const created = await api.createUser(token, {
          email: form.email.trim() || undefined,
          username: form.username.trim() || undefined,
          password: form.passwordEnabled ? form.password : undefined,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          passwordEnabled: form.passwordEnabled,
          magicLinkEnabled: form.magicLinkEnabled,
          ...(form.role === 'STAFF' && form.roleTemplate
            ? { roleTemplate: form.roleTemplate }
            : {}),
        });
        if (form.role === 'STAFF' && form.roleTemplate && !created.permissions?.length) {
          const template = templates.find((t) => t.id === form.roleTemplate);
          if (template) {
            await api.updateUserPermissions(token, created.id, {
              permissions: template.permissions,
              roleTemplate: template.id,
            });
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

  const handleSavePermissions = async () => {
    if (!token || !permUserId) return;
    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) return;
    setSaving(true);
    setError('');
    try {
      await api.updateUserPermissions(token, permUserId, {
        permissions: template.permissions,
        roleTemplate: template.id,
      });
      setPermDialogOpen(false);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Team">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Team</Typography>
          <Typography variant="body2" color="text.secondary">
            Mitarbeiter mit Rollenvorlagen zuweisen — Küche, Kasse, Finanzen und mehr
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
              <TableCell>Benutzername</TableCell>
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
                <TableCell>{user.username || '—'}</TableCell>
                <TableCell>{user.email || '—'}</TableCell>
                <TableCell>
                  <Chip
                    label={displayRole(user)}
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
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {user.role === 'STAFF' && (
                      <Button size="small" startIcon={<SecurityIcon />} onClick={() => openPermissions(user)}>
                        Vorlage
                      </Button>
                    )}
                    <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(user)}>
                      Bearbeiten
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
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
              label="Benutzername"
              fullWidth
              required={form.role === 'STAFF'}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              helperText={form.role === 'STAFF' ? 'Eindeutiger Login-Name, z. B. Kasse1' : 'Optional für Passwort-Anmeldung'}
            />
            <TextField
              label="E-Mail"
              type="email"
              fullWidth
              required={form.role === 'ADMIN'}
              value={form.email}
              onChange={(e) => setForm({
                ...form,
                email: e.target.value,
                magicLinkEnabled: form.role === 'ADMIN' ? true : Boolean(e.target.value.trim()),
              })}
              helperText={form.role === 'STAFF' ? 'Optional — erforderlich für Magic Link' : 'Pflicht für Administratoren'}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.magicLinkEnabled}
                  onChange={(e) => setForm({ ...form, magicLinkEnabled: e.target.checked })}
                  disabled={!form.email.trim()}
                />
              }
              label="Magic-Link-Anmeldung"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.passwordEnabled}
                  onChange={(e) => setForm({ ...form, passwordEnabled: e.target.checked })}
                />
              }
              label="Passwort-Anmeldung"
            />
            {form.passwordEnabled && (
              <TextField
                label={editingId ? 'Neues Passwort (optional)' : (form.role === 'STAFF' ? 'Passwort / PIN' : 'Passwort')}
                type="password"
                fullWidth
                required={!editingId}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                helperText={form.role === 'STAFF' ? 'Mindestens 4 Zeichen' : 'Mindestens 8 Zeichen'}
              />
            )}
            <FormControl fullWidth>
              <InputLabel>Rolle</InputLabel>
              <Select
                label="Rolle"
                value={form.role}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
              >
                <MenuItem value="STAFF">Mitarbeiter</MenuItem>
                <MenuItem value="ADMIN">Administrator</MenuItem>
              </Select>
            </FormControl>
            {form.role === 'STAFF' && (
              <FormControl fullWidth>
                <InputLabel>Rollenvorlage</InputLabel>
                <Select
                  label="Rollenvorlage"
                  value={form.roleTemplate}
                  onChange={(e) => setForm({ ...form, roleTemplate: e.target.value as RoleTemplateId })}
                >
                  {templates.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.label} — {t.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
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

      <Dialog open={permDialogOpen} onClose={() => setPermDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rollenvorlage ändern</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Fachliche Vorlagen ersetzen technische Berechtigungslisten. Jeder Mitarbeiter erhält eigene Rechte.
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Vorlage</InputLabel>
            <Select
              label="Vorlage"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value as RoleTemplateId)}
            >
              {templates.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  <Box>
                    <Typography fontWeight={600}>{t.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{t.description}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={() => void handleSavePermissions()} disabled={saving}>
            {saving ? 'Speichern…' : 'Vorlage zuweisen'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
