import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Table, TableBody, TableCell,
  TableHead, TableRow, Paper, Chip, IconButton, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { platformApi, type TenantApplication } from '@/services/platformApi';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Neu',
  UNDER_REVIEW: 'In Prüfung',
  CLARIFICATION: 'Rückfrage',
  APPROVED: 'Genehmigt',
  REJECTED: 'Abgelehnt',
  ARCHIVED: 'Archiviert',
};

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  NEW: 'info',
  UNDER_REVIEW: 'warning',
  CLARIFICATION: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  ARCHIVED: 'default',
};

export function PlatformApplicationsPage() {
  const { token } = usePlatformAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<TenantApplication[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!token) return;
    setLoading(true);
    platformApi.listApplications(token, { search: search || undefined, status: status || undefined })
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, search, status]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Mandantenanträge</Typography>
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <TextField label="Suche" value={search} onChange={(e) => setSearch(e.target.value)} size="small" />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="">Alle</MenuItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Organisation</TableCell>
              <TableCell>Subdomain</TableCell>
              <TableCell>Ansprechpartner</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Datum</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6}>Laden…</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={6}>Keine Bewerbungen</TableCell></TableRow>
            ) : items.map((a) => (
              <TableRow key={a.id} hover>
                <TableCell>{a.organization}</TableCell>
                <TableCell>{a.requestedSubdomain}</TableCell>
                <TableCell>{a.contactName}</TableCell>
                <TableCell>
                  <Chip size="small" label={STATUS_LABELS[a.status] ?? a.status} color={STATUS_COLORS[a.status] ?? 'default'} />
                </TableCell>
                <TableCell>{new Date(a.createdAt).toLocaleDateString('de-DE')}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => navigate(`/platform/bewerbungen/${a.id}`)} title="Details">
                    <VisibilityIcon />
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
