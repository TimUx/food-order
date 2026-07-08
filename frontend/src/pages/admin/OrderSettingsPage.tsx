import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import {
  ClubSettings,
  DEFAULT_ORDER_FIELD_CONFIG,
  DEFAULT_ORDER_SETTINGS,
  OrderFieldConfig,
} from '@/types/club';

export function OrderSettingsPage() {
  const { token } = useAuth();
  const [fields, setFields] = useState<OrderFieldConfig>(DEFAULT_ORDER_FIELD_CONFIG);
  const [cancellationDeadlineHours, setCancellationDeadlineHours] = useState(
    DEFAULT_ORDER_SETTINGS.cancellationDeadlineHours
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token) return;
    api.getClubSettings(token)
      .then((data: ClubSettings) => {
        setFields({
          firstNameRequired: data.orderFieldFirstNameRequired ?? DEFAULT_ORDER_FIELD_CONFIG.firstNameRequired,
          lastNameRequired: data.orderFieldLastNameRequired ?? DEFAULT_ORDER_FIELD_CONFIG.lastNameRequired,
          emailRequired: data.orderFieldEmailRequired ?? DEFAULT_ORDER_FIELD_CONFIG.emailRequired,
          phoneRequired: data.orderFieldPhoneRequired ?? DEFAULT_ORDER_FIELD_CONFIG.phoneRequired,
        });
        setCancellationDeadlineHours(
          data.cancellationDeadlineHours ?? DEFAULT_ORDER_SETTINGS.cancellationDeadlineHours
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.updateClubSettings(token, {
        orderFieldFirstNameRequired: fields.firstNameRequired,
        orderFieldLastNameRequired: fields.lastNameRequired,
        orderFieldEmailRequired: fields.emailRequired,
        orderFieldPhoneRequired: fields.phoneRequired,
        cancellationDeadlineHours,
      });
      setSuccess('Bestell-Einstellungen gespeichert');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const fieldLabels: { key: keyof OrderFieldConfig; label: string }[] = [
    { key: 'firstNameRequired', label: 'Vorname' },
    { key: 'lastNameRequired', label: 'Nachname' },
    { key: 'emailRequired', label: 'E-Mail' },
    { key: 'phoneRequired', label: 'Telefon' },
  ];

  return (
    <AdminLayout title="Bestell-Einstellungen">
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Öffentliche Bestellung
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Legen Sie fest, welche Felder auf der Bestellseite Pflicht sind, und wie lange Kunden stornieren können.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: 3, maxWidth: 600 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Pflichtfelder
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Nur wenn alle als Pflicht markierten Felder ausgefüllt sind, kann die Bestellung abgeschickt werden.
              </Typography>
              <Stack spacing={1}>
                {fieldLabels.map(({ key, label }) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Switch
                        checked={fields[key]}
                        onChange={(e) => setFields({ ...fields, [key]: e.target.checked })}
                      />
                    }
                    label={`${label} ${fields[key] ? '(Pflicht)' : '(optional)'}`}
                  />
                ))}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Stornierungsfrist
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Anzahl Stunden vor Veranstaltungsbeginn, bis zu der Kunden ihre Online-Bestellung selbst stornieren können.
              </Typography>
              <TextField
                label="Stunden vor Veranstaltungsbeginn"
                type="number"
                fullWidth
                value={cancellationDeadlineHours}
                onChange={(e) => setCancellationDeadlineHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                inputProps={{ min: 0, max: 720 }}
                helperText="z. B. 24 = Stornierung bis 24 Stunden vor Beginn der Veranstaltung möglich"
              />
            </Box>

            <Button
              variant="contained"
              size="large"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              Speichern
            </Button>
          </Stack>
        </Paper>
      )}
    </AdminLayout>
  );
}
