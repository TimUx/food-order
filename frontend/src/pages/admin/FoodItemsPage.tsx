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
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api, formatPrice } from '@/services/api';
import { FoodItem } from '@/types';

interface FoodForm {
  name: string;
  description: string;
  price: string;
  sortOrder: string;
  active: boolean;
  maxQuantity: string;
}

const emptyForm: FoodForm = {
  name: '',
  description: '',
  price: '',
  sortOrder: '0',
  active: true,
  maxQuantity: '',
};

export function FoodItemsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [form, setForm] = useState<FoodForm>(emptyForm);

  const loadItems = () => {
    if (!token) return;
    api.getFoodCatalog(token).then(setItems).catch((err) => setError(err.message));
  };

  useEffect(() => {
    if (!token) return;
    loadItems();
    setLoading(false);
  }, [token]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: FoodItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      sortOrder: String(item.sortOrder),
      active: item.active,
      maxQuantity: item.maxQuantity ? String(item.maxQuantity) : '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!token) return;
    const data = {
      name: form.name,
      description: form.description || undefined,
      price: parseFloat(form.price),
      sortOrder: parseInt(form.sortOrder, 10) || 0,
      active: form.active,
      maxQuantity: form.maxQuantity ? parseInt(form.maxQuantity, 10) : null,
    };
    try {
      if (editing) {
        await api.updateFoodItem(token, editing.id, data);
      } else {
        await api.createFoodCatalogItem(token, data);
      }
      setDialogOpen(false);
      loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Gericht wirklich löschen? Es wird von allen Veranstaltungen entfernt.')) return;
    try {
      await api.deleteFoodItem(token, id);
      loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen');
    }
  };

  const handleImageUpload = async (id: string, file: File) => {
    if (!token) return;
    try {
      await api.uploadFoodImage(token, id, file);
      loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Speisenverwaltung">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Speisenverwaltung" fullWidth>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Hier verwalten Sie den mandantenweiten Speisenkatalog. Welche Gerichte bei einer Veranstaltung angeboten werden, legen Sie unter Veranstaltungen fest.
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Gerichte verwalten</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Neues Gericht
        </Button>
      </Box>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Reihenfolge</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Preis</TableCell>
            <TableCell>Aktiv</TableCell>
            <TableCell>Max. Menge</TableCell>
            <TableCell align="right">Aktionen</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.sortOrder}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{formatPrice(Number(item.price))}</TableCell>
              <TableCell>{item.active ? 'Ja' : 'Nein'}</TableCell>
              <TableCell>{item.maxQuantity ?? '–'}</TableCell>
              <TableCell align="right">
                <IconButton component="label" size="small">
                  <PhotoCameraIcon />
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(item.id, file);
                    }}
                  />
                </IconButton>
                <IconButton size="small" onClick={() => openEdit(item)}>
                  <EditIcon />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Gericht bearbeiten' : 'Neues Gericht'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" fullWidth required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Beschreibung" fullWidth multiline rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <TextField label="Preis (€)" type="number" fullWidth required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <TextField label="Reihenfolge" type="number" fullWidth value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            <TextField label="Max. Bestellmenge (optional)" type="number" fullWidth value={form.maxQuantity} onChange={(e) => setForm({ ...form, maxQuantity: e.target.value })} />
            <FormControlLabel control={<Switch checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />} label="Aktiv" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSave}>Speichern</Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
