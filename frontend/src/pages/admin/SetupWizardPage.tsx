import { useState } from 'react';
import {
  Typography, Box, Button, Stepper, Step, StepLabel, Paper, Alert, TextField, Stack,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

const STEPS = ['Veranstalter', 'Veranstaltung', 'Speisekarte', 'Zahlungsart', 'Mitarbeiter', 'Fertig'];

type PaymentPreset = 'cash_only' | 'cash_and_card' | 'online';

const PAYMENT_PRESET_SETTINGS: Record<PaymentPreset, { allowCashOnSite: boolean; onlinePaymentForEvents: boolean }> = {
  cash_only: { allowCashOnSite: true, onlinePaymentForEvents: false },
  cash_and_card: { allowCashOnSite: true, onlinePaymentForEvents: true },
  online: { allowCashOnSite: false, onlinePaymentForEvents: true },
};

const SAMPLE_DISHES = [
  { name: 'Bratwurst', description: 'Mit Brot', price: 3.5 },
  { name: 'Pommes', description: 'Portion', price: 2.5 },
];

export function SetupWizardPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [clubName, setClubName] = useState('');
  const [eventName, setEventName] = useState('Sommerfest');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventId, setEventId] = useState('');
  const [paymentPreset, setPaymentPreset] = useState<PaymentPreset>('cash_and_card');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffFirstName, setStaffFirstName] = useState('');
  const [staffLastName, setStaffLastName] = useState('');

  const savePaymentPreset = async () => {
    if (!token) return;
    const settings = PAYMENT_PRESET_SETTINGS[paymentPreset];
    await api.updateSettings(token, 'module.payment', settings);
  };

  const next = async () => {
    if (!token) return;
    setError('');
    try {
      if (step === 0) {
        if (!clubName.trim()) {
          setError('Bitte Namen des Veranstalters eingeben');
          return;
        }
        await api.updateClubSettings(token, { clubName: clubName.trim() });
      }
      if (step === 1) {
        const event = await api.createEvent(token, {
          name: eventName,
          date: eventDate,
          startTime: '11:00',
          endTime: '22:00',
          onlineOrdersActive: true,
          cashierActive: true,
          activateOnCreate: true,
        });
        setEventId(event.id);
      }
      if (step === 2 && eventId) {
        for (const [index, dish] of SAMPLE_DISHES.entries()) {
          await api.createFoodItem(token, eventId, {
            name: dish.name,
            description: dish.description,
            price: dish.price,
            sortOrder: index,
            active: true,
          });
        }
      }
      if (step === 3) {
        await savePaymentPreset();
      }
      if (step === 4) {
        if (staffEmail.trim() && staffPassword.trim() && staffFirstName.trim() && staffLastName.trim()) {
          await api.createUser(token, {
            email: staffEmail.trim(),
            password: staffPassword,
            firstName: staffFirstName.trim(),
            lastName: staffLastName.trim(),
            role: 'STAFF',
          });
        }
      }
      if (step < STEPS.length - 1) {
        setStep(step + 1);
      } else {
        navigate('/admin');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  };

  const skipStaff = () => {
    setError('');
    setStep(step + 1);
  };

  return (
    <AdminLayout title="Einrichtungsassistent">
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        In wenigen Schritten richten Sie Ihren Veranstalter für die erste Veranstaltung ein.
      </Typography>
      <Stepper activeStep={step} sx={{ mb: 4 }} alternativeLabel>
        {STEPS.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 3, maxWidth: 560 }}>
        {step === 0 && (
          <TextField
            label="Name des Veranstalters"
            fullWidth
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
            placeholder="z.B. SV Musterstadt e.V."
          />
        )}
        {step === 1 && (
          <Stack spacing={2}>
            <TextField label="Veranstaltungsname" fullWidth value={eventName} onChange={(e) => setEventName(e.target.value)} />
            <TextField label="Datum" type="date" fullWidth value={eventDate} onChange={(e) => setEventDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Stack>
        )}
        {step === 2 && (
          <Stack spacing={2}>
            <Typography variant="body1">
              Wir legen zwei Beispielgerichte an – Sie können sie später unter „Speisen“ anpassen.
            </Typography>
            {SAMPLE_DISHES.map((dish) => (
              <Box key={dish.name} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography fontWeight={600}>{dish.name}</Typography>
                <Typography variant="body2" color="text.secondary">{dish.description} · {dish.price.toFixed(2).replace('.', ',')} €</Typography>
              </Box>
            ))}
          </Stack>
        )}
        {step === 3 && (
          <FormControl>
            <FormLabel sx={{ mb: 1 }}>Wie sollen Gäste bezahlen?</FormLabel>
            <RadioGroup value={paymentPreset} onChange={(e) => setPaymentPreset(e.target.value as PaymentPreset)}>
              <FormControlLabel value="cash_only" control={<Radio />} label="Nur Barzahlung vor Ort" />
              <FormControlLabel value="cash_and_card" control={<Radio />} label="Bar + Karte vor Ort" />
              <FormControlLabel value="online" control={<Radio />} label="Online-Zahlung" />
            </RadioGroup>
          </FormControl>
        )}
        {step === 4 && (
          <Stack spacing={2}>
            <Typography variant="body1">
              Optional: Legen Sie einen Mitarbeiter-Zugang an (z. B. für Küche oder Kasse).
            </Typography>
            <Divider />
            <TextField label="Vorname" fullWidth value={staffFirstName} onChange={(e) => setStaffFirstName(e.target.value)} />
            <TextField label="Nachname" fullWidth value={staffLastName} onChange={(e) => setStaffLastName(e.target.value)} />
            <TextField label="E-Mail" type="email" fullWidth value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} />
            <TextField label="Passwort" type="password" fullWidth value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} />
          </Stack>
        )}
        {step === 5 && (
          <Alert severity="success">
            Ihr Veranstalter ist eingerichtet. Unter „Veranstaltungen“ und „Speisen“ können Sie alles weiter anpassen.
          </Alert>
        )}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          {step === 4 && (
            <Button onClick={skipStaff}>Überspringen</Button>
          )}
          <Button variant="contained" onClick={() => void next()}>
            {step === STEPS.length - 1 ? 'Zur Übersicht' : 'Weiter'}
          </Button>
        </Box>
      </Paper>
    </AdminLayout>
  );
}
