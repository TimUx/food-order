import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Checkbox, FormControlLabel, Paper, TextField, Typography, Chip, Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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

export function PlatformApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = usePlatformAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState<TenantApplication | null>(null);
  const [comment, setComment] = useState('');
  const [createTenant, setCreateTenant] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    if (!token || !id) return;
    platformApi.getApplication(token, id).then((a) => {
      setApplication(a);
      setComment(a.adminComment ?? '');
    });
  };

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

  if (!application) return <Typography>Laden…</Typography>;

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
          <Typography><strong>Subdomain:</strong> {application.requestedSubdomain}</Typography>
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
            Genehmigen
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
        </Stack>
        {application.tenantId && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Verknüpfter Mandant: {application.tenantId}
          </Alert>
        )}
      </Paper>
    </Box>
  );
}
