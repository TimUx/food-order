import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Autocomplete, Box, Button, Checkbox, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, FormControlLabel, Link, Paper, TextField, Typography, Chip, Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { platformApi, type PlatformTenant, type TenantApplication } from '@/services/platformApi';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Neu',
  UNDER_REVIEW: 'In Prüfung',
  CLARIFICATION: 'Rückfrage',
  APPROVED: 'Genehmigt',
  REJECTED: 'Abgelehnt',
  ARCHIVED: 'Archiviert',
};

export function PlatformApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = usePlatformAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState<TenantApplication | null>(null);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<PlatformTenant | null>(null);
  const [comment, setComment] = useState('');
  const [createTenant, setCreateTenant] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = () => {
    if (!token || !id) return;
    platformApi.getApplication(token, id).then((a) => {
      setApplication(a);
      setComment(a.adminComment ?? '');
      if (a.linkedTenant) {
        setSelectedTenant({
          id: a.linkedTenant.id,
          name: a.linkedTenant.name,
          slug: a.linkedTenant.slug,
          status: a.linkedTenant.status,
        } as PlatformTenant);
      } else {
        setSelectedTenant(null);
      }
    });
  };

  useEffect(() => {
    if (!token) return;
    platformApi.listTenants(token, { page: 1 }).then((r) => setTenants(r.items));
  }, [token]);

  useEffect(load, [token, id]);

  const act = async (fn: () => Promise<unknown>) => {
    setError('');
    setMessage('');
    try {
      await fn();
      setMessage('Aktion erfolgreich.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    }
  };

  const handleDelete = async () => {
    setDeleteOpen(false);
    if (!token || !id) return;
    setError('');
    try {
      await platformApi.deleteApplication(token, id);
      navigate('/platform/bewerbungen');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    }
  };

  if (!application) return <Typography>Laden…</Typography>;

  const canReApprove = application.status === 'APPROVED' && !application.tenantId;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/platform/bewerbungen')} sx={{ mb: 2 }}>
        Zurück
      </Button>
      <Typography variant="h4" gutterBottom>{application.organization}</Typography>
      <Chip label={STATUS_LABELS[application.status] ?? application.status} sx={{ mb: 2 }} />
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={1}>
          <Typography><strong>Typ:</strong> {application.organizationType}</Typography>
          <Typography><strong>Ansprechpartner:</strong> {application.contactName}</Typography>
          <Typography><strong>E-Mail:</strong> {application.email}</Typography>
          <Typography><strong>Telefon:</strong> {application.phone ?? '–'}</Typography>
          <Typography><strong>Adresse:</strong> {application.street}, {application.postalCode} {application.city}, {application.country}</Typography>
          <Typography><strong>Gewünschte Internetadresse:</strong> {application.requestedSubdomain}</Typography>
          <Typography><strong>Mitglieder:</strong> {application.memberCount ?? '–'}</Typography>
          <Typography><strong>Veranstaltungen/Jahr:</strong> {application.eventsPerYear ?? '–'}</Typography>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Angaben</Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap', mb: 1 }}><strong>Begründung:</strong> {application.reason}</Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap', mb: 1 }}><strong>Funktionen:</strong> {application.desiredFeatures}</Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap', mb: 1 }}><strong>Kostenloser Mandant:</strong> {application.freeTierJustification}</Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap', mb: 1 }}><strong>Geplante Nutzung:</strong> {application.plannedUsage}</Typography>
        {application.notes && <Typography sx={{ whiteSpace: 'pre-wrap' }}><strong>Bemerkungen:</strong> {application.notes}</Typography>}
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Mandanten-Verknüpfung</Typography>
        {application.linkedTenant ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            Verknüpft mit{' '}
            <Link component={RouterLink} to={`/platform/mandanten/${application.linkedTenant.id}`}>
              {application.linkedTenant.name}
            </Link>
            {' '}(Adresse: {application.linkedTenant.slug})
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Keine Verknüpfung mit einem Mandanten.
            {canReApprove && ' Über „Genehmigen“ kann der Mandant erneut automatisch angelegt werden.'}
          </Alert>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }} sx={{ mb: 2 }}>
          <Autocomplete
            sx={{ flex: 1, minWidth: 280 }}
            options={tenants}
            getOptionLabel={(t) => `${t.name} (${t.slug})`}
            value={selectedTenant}
            onChange={(_, value) => setSelectedTenant(value)}
            renderInput={(params) => <TextField {...params} label="Mandant auswählen" size="small" />}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
          />
          <Button
            variant="outlined"
            disabled={!selectedTenant || selectedTenant.id === application.tenantId}
            onClick={() => act(() => platformApi.setApplicationTenantLink(token!, id!, selectedTenant!.id))}
          >
            {application.tenantId ? 'Verknüpfung ändern' : 'Verknüpfen'}
          </Button>
          {application.tenantId && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<LinkOffIcon />}
              onClick={() => act(() => platformApi.setApplicationTenantLink(token!, id!, null))}
            >
              Verknüpfung aufheben
            </Button>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Kommentar (intern)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" onClick={() => act(() => platformApi.updateApplicationStatus(token!, id!, 'UNDER_REVIEW', comment))}>
            In Prüfung
          </Button>
          <Button variant="outlined" onClick={() => act(() => platformApi.updateApplicationStatus(token!, id!, 'CLARIFICATION', comment))}>
            Rückfrage
          </Button>
          <FormControlLabel
            control={<Checkbox checked={createTenant} onChange={(e) => setCreateTenant(e.target.checked)} />}
            label="Mandant automatisch anlegen"
          />
          <Button
            variant="contained"
            color="success"
            onClick={() => act(() => platformApi.approveApplication(token!, id!, { createTenant, adminComment: comment }))}
          >
            {canReApprove && createTenant ? 'Erneut genehmigen & Mandant anlegen' : 'Genehmigen'}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => act(() => platformApi.rejectApplication(token!, id!, comment))}
          >
            Ablehnen
          </Button>
          <Button variant="text" onClick={() => act(() => platformApi.archiveApplication(token!, id!))}>
            Archivieren
          </Button>
          <Button variant="text" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteOpen(true)}>
            Löschen
          </Button>
        </Stack>
      </Paper>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Bewerbung löschen?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Die Bewerbung von „{application.organization}“ wird unwiderruflich gelöscht.
            Dies kann nicht rückgängig gemacht werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Abbrechen</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Löschen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
