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
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api, formatPrice } from '@/services/api';
import { Event, FoodItem } from '@/types';

interface EventForm {
  name: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  onlineOrdersActive: boolean;
  cashierActive: boolean;
  ordersClosed: boolean;
  isActive: boolean;
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
  isActive: true,
};

export function EventsPage() {
  const { token } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [foodDialogOpen, setFoodDialogOpen] = useState(false);
  const [foodEvent, setFoodEvent] = useState<Event | null>(null);
  const [foodAssignments, setFoodAssignments] = useState<FoodItem[]>([]);
  const [foodLoading, setFoodLoading] = useState(false);
  const [foodSaving, setFoodSaving] = useState(false);

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
      isActive: event.isActive,
    });
    setDialogOpen(true);
  };

  const openFoodAssignments = async (event: Event) => {
    if (!token) return;
    setFoodEvent(event);
    setFoodDialogOpen(true);
    setFoodLoading(true);
    setError('');
    try {
      const assignments = await api.getEventFoodAssignments(token, event.id);
      setFoodAssignments(assignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zuordnungen konnten nicht geladen werden');
    } finally {
      setFoodLoading(false);
    }
  };

  const toggleFoodAssignment = (id: string) => {
    setFoodAssignments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, assigned: !item.assigned } : item))
    );
  };

  const handleSaveFoodAssignments = async () => {
    if (!token || !foodEvent) return;
    setFoodSaving(true);
    setError('');
    try {
      const foodItemIds = foodAssignments.filter((item) => item.assigned).map((item) => item.id);
      await api.setEventFoodAssignments(token, foodEvent.id, foodItemIds);
      setFoodDialogOpen(false);
      setFoodEvent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setFoodSaving(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    const payload = { ...form };
    try {
      if (editing) {
        await api.updateEvent(token, editing.id, payload);
      } else {
        await api.createEvent(token, { ...payload, activateOnCreate: payload.isActive });
      }
      setDialogOpen(false);
      loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    }
  };

  const handleDelete = async (event: Event) => {
    if (!token) return;
    const confirmed = confirm(
      `Veranstaltung „${event.name}“ wirklich löschen?\n\nZuordnungen für Speisen & Getränke werden entfernt. Nicht möglich, wenn bereits Bestellungen existieren.`
    );
    if (!confirmed) return;
    setError('');
    try {
      await api.deleteEvent(token, event.id);
      loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen');
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Veranstaltungen">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  const assignedCount = foodAssignments.filter((item) => item.assigned).length;

  return (
    <AdminLayout title="Veranstaltungen" fullWidth>
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
                  {event.isActive
                    ? <Chip label="Aktiv" color="primary" size="small" icon={<CheckCircleIcon />} />
                    : <Chip label="Inaktiv" size="small" />}
                </Box>
                {event.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{event.description}</Typography>
                )}
                <Typography variant="body2">
                  {new Date(event.date).toLocaleDateString('de-DE')} · {event.startTime} – {event.endTime}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                  <Chip label={event.onlineOrdersActive ? 'Online aktiv' : 'Online inaktiv'} size="small" color={event.onlineOrdersActive ? 'success' : 'default'} />
                  <Chip label={event.cashierActive ? 'Bestellung vor Ort aktiv' : 'Bestellung vor Ort inaktiv'} size="small" color={event.cashierActive ? 'success' : 'default'} />
                  {event.ordersClosed && <Chip label="Bestellungen geschlossen" size="small" color="error" />}
                </Stack>
              </CardContent>
              <CardActions>
                <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(event)}>Bearbeiten</Button>
                <Button size="small" startIcon={<RestaurantMenuIcon />} onClick={() => void openFoodAssignments(event)}>Speisen & Getränke</Button>
                <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => void handleDelete(event)}>
                  Löschen
                </Button>
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
            <FormControlLabel control={<Switch checked={form.cashierActive} onChange={(e) => setForm({ ...form, cashierActive: e.target.checked })} />} label="Bestellung vor Ort aktiv" />
            <FormControlLabel control={<Switch checked={form.ordersClosed} onChange={(e) => setForm({ ...form, ordersClosed: e.target.checked })} />} label="Bestellungen geschlossen" />
            <FormControlLabel control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />} label="Veranstaltung aktiv" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSave}>Speichern</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={foodDialogOpen} onClose={() => setFoodDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Speisen & Getränke für {foodEvent?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Wählen Sie die Einträge aus dem Katalog, die bei dieser Veranstaltung angeboten werden sollen.
          </Typography>
          {foodLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : foodAssignments.length === 0 ? (
            <Alert severity="info">
              Noch keine Einträge im Katalog. Legen Sie zuerst Speisen & Getränke im Katalog an.
            </Alert>
          ) : (
            <List dense disablePadding>
              {foodAssignments.map((item) => (
                <ListItem key={item.id} disablePadding>
                  <ListItemButton onClick={() => toggleFoodAssignment(item.id)}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        edge="start"
                        checked={!!item.assigned}
                        tabIndex={-1}
                        disableRipple
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.name}
                      secondary={`${formatPrice(Number(item.price))}${item.active ? '' : ' · inaktiv'}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1, pl: 2 }}>
            {assignedCount} von {foodAssignments.length} ausgewählt
          </Typography>
          <Button onClick={() => setFoodDialogOpen(false)}>Abbrechen</Button>
          <Button
            variant="contained"
            onClick={() => void handleSaveFoodAssignments()}
            disabled={foodLoading || foodSaving || foodAssignments.length === 0}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
