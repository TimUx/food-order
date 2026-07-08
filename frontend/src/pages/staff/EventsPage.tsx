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
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { StaffLayout } from '@/components/StaffLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Event } from '@/types';

interface EventForm {
  name: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  onlineOrdersActive: boolean;
  cashierActive: boolean;
  ordersClosed: boolean;
}

const emptyForm: EventForm = {
  name: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  startTime: '11:00',
  endTime: '22:00',
  onlineOrdersActive: true,
  cashierActive: true,
  ordersClosed: false,
};

export function EventsPage() {
  const { token } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);

  const loadEvents = () => {
    if (!token) return;
    api.getEvents(token).then(setEvents).catch((err) => setError(err.message));
  };

  useEffect(() => {
    loadEvents();
    setLoading(false);
  }, [token]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (event: Event) => {
    setEditing(event);
    setForm({
      name: event.name,
      description: event.description || '',
      date: event.date.split('T')[0],
      startTime: event.startTime,
      endTime: event.endTime,
      onlineOrdersActive: event.onlineOrdersActive,
      cashierActive: event.cashierActive,
      ordersClosed: event.ordersClosed,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!token) return;
    try {
      if (editing) {
        await api.updateEvent(token, editing.id, form);
      } else {
        await api.createEvent(token, form);
      }
      setDialogOpen(false);
      loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    }
  };

  const handleActivate = async (id: string) => {
    if (!token) return;
    try {
      await api.activateEvent(token, id);
      loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aktivierung fehlgeschlagen');
    }
  };

  if (loading) {
    return (
      <StaffLayout title="Veranstaltungen">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout title="Veranstaltungen" fullWidth>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Veranstaltungen verwalten</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Neue Veranstaltung
        </Button>
      </Box>

      <Grid container spacing={2}>
        {events.map((event) => (
          <Grid key={event.id} size={{ xs: 12, md: 6 }}>
            <Card variant={event.isActive ? 'outlined' : undefined} sx={{ borderColor: event.isActive ? 'primary.main' : undefined, borderWidth: event.isActive ? 2 : undefined }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" fontWeight={700}>{event.name}</Typography>
                  {event.isActive && <Chip label="Aktiv" color="primary" size="small" icon={<CheckCircleIcon />} />}
                </Box>
                {event.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{event.description}</Typography>
                )}
                <Typography variant="body2">
                  {new Date(event.date).toLocaleDateString('de-DE')} · {event.startTime} – {event.endTime}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                  <Chip label={event.onlineOrdersActive ? 'Online aktiv' : 'Online inaktiv'} size="small" color={event.onlineOrdersActive ? 'success' : 'default'} />
                  <Chip label={event.cashierActive ? 'Kasse aktiv' : 'Kasse inaktiv'} size="small" color={event.cashierActive ? 'success' : 'default'} />
                  {event.ordersClosed && <Chip label="Bestellungen geschlossen" size="small" color="error" />}
                </Stack>
              </CardContent>
              <CardActions>
                <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(event)}>Bearbeiten</Button>
                {!event.isActive && (
                  <Button size="small" color="primary" onClick={() => handleActivate(event.id)}>Aktivieren</Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Veranstaltung bearbeiten' : 'Neue Veranstaltung'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" fullWidth required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Beschreibung" fullWidth multiline rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <TextField label="Datum" type="date" fullWidth required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="Beginn" type="time" fullWidth required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="Ende" type="time" fullWidth required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} InputLabelProps={{ shrink: true }} />
            <FormControlLabel control={<Switch checked={form.onlineOrdersActive} onChange={(e) => setForm({ ...form, onlineOrdersActive: e.target.checked })} />} label="Onlinebestellungen aktiv" />
            <FormControlLabel control={<Switch checked={form.cashierActive} onChange={(e) => setForm({ ...form, cashierActive: e.target.checked })} />} label="Kasse aktiv" />
            <FormControlLabel control={<Switch checked={form.ordersClosed} onChange={(e) => setForm({ ...form, ordersClosed: e.target.checked })} />} label="Bestellungen geschlossen" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSave}>Speichern</Button>
        </DialogActions>
      </Dialog>
    </StaffLayout>
  );
}
