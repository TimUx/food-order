import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Table, TableBody, TableCell,
  TableHead, TableRow, Paper, Chip, IconButton, MenuItem, Select, FormControl, InputLabel, Alert,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LoginIcon from '@mui/icons-material/Login';
import AddIcon from '@mui/icons-material/Add';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { platformApi, type PlatformTenant } from '@/services/platformApi';
import { startTenantImpersonation } from '@/utils/impersonation';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  ARCHIVED: 'error',
  PENDING: 'default',
};

export function PlatformTenantsPage() {
  const { token } = usePlatformAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<PlatformTenant[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [actionError, setActionError] = useState('');
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    email: '',
    contactName: '',
    phone: '',
  });

  const load = () => {
    if (!token) return;
    setLoading(true);
    platformApi.listTenants(token, { search: search || undefined, status: status || undefined })
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, search, status]);

  const handleCreate = async () => {
    if (!token) return;
    const slug = form.slug.trim();
    await platformApi.createTenant(token, { ...form, slug });
    setShowCreate(false);
    setForm({ name: '', slug: '', email: '', contactName: '', phone: '' });
    load();
  };

  const handleImpersonate = async (tenantId: string) => {
    if (!token) return;
    setActionError('');
    setImpersonatingId(tenantId);
    try {
      await startTenantImpersonation(token, tenantId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Anmeldung als Mandanten-Admin fehlgeschlagen');
      setImpersonatingId(null);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Mandanten</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreate(!showCreate)}>
          Neuer Mandant
        </Button>
      </Box>

      {showCreate && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>Mandant erstellen</Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Ansprechpartner" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            <TextField label="E-Mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <TextField label="Slug (URL-Pfad)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} helperText="z. B. mein-verein" />
            <Button variant="contained" onClick={handleCreate}>Erstellen</Button>
          </Box>
        </Paper>
      )}

      <Box display="flex" gap={2} mb={2}>
        <TextField label="Suche" value={search} onChange={(e) => setSearch(e.target.value)} size="small" />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="">Alle</MenuItem>
            <MenuItem value="ACTIVE">Aktiv</MenuItem>
            <MenuItem value="SUSPENDED">Gesperrt</MenuItem>
            <MenuItem value="ARCHIVED">Archiviert</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError('')}>
          {actionError}
        </Alert>
      )}

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Pfad (Slug)</TableCell>
              <TableCell>Ansprechpartner</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Benutzer</TableCell>
              <TableCell>Veranstaltungen</TableCell>
              <TableCell>Module</TableCell>
              <TableCell align="right">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8}>Laden…</TableCell></TableRow>
            ) : items.map((t) => (
              <TableRow key={t.id} hover>
              <TableCell>{t.name}</TableCell>
              <TableCell>{t.slug}</TableCell>
              <TableCell>{t.contactName ?? '–'}</TableCell>
                <TableCell><Chip size="small" label={t.status} color={STATUS_COLORS[t.status] ?? 'default'} /></TableCell>
                <TableCell>{t.stats?.activeUsers ?? '–'}</TableCell>
                <TableCell>{t.stats?.events ?? '–'}</TableCell>
                <TableCell>{t.stats?.modules ?? '–'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => navigate(`/platform/mandanten/${t.id}`)} title="Details">
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => void handleImpersonate(t.id)}
                    title="Als Admin anmelden"
                    disabled={t.status !== 'ACTIVE' || impersonatingId === t.id}
                  >
                    <LoginIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
