import { useEffect, useState } from 'react';
import {
  Typography, Box, Button, Stepper, Step, StepLabel, Paper, Alert, TextField, Stack,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Divider, Checkbox,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

const STEPS = [
  'Willkommen',
  'Organisation',
  'Kontakt',
  'Rechtliches',
  'Administrator',
  'Veranstaltung',
  'Abschluss',
];

const ORG_TYPES = [
  { value: 'verein', label: 'Verein' },
  { value: 'feuerwehr', label: 'Feuerwehr' },
  { value: 'hilfsorganisation', label: 'Hilfsorganisation' },
  { value: 'schule', label: 'Schule' },
  { value: 'kommune', label: 'Kommune' },
  { value: 'firma', label: 'Firma' },
  { value: 'sonstige', label: 'Sonstige' },
];

export function SetupWizardPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('verein');
  const [orgDescription, setOrgDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Deutschland');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [socialMedia, setSocialMedia] = useState('');

  const [impressum, setImpressum] = useState('');
  const [privacy, setPrivacy] = useState('');
  const [terms, setTerms] = useState('');
  const [revocation, setRevocation] = useState('');

  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [locale, setLocale] = useState('de-DE');
  const [timezone, setTimezone] = useState('Europe/Berlin');

  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [orderStart, setOrderStart] = useState('11:00');
  const [orderEnd, setOrderEnd] = useState('20:00');
  const [pickupStart, setPickupStart] = useState('11:00');
  const [pickupEnd, setPickupEnd] = useState('22:00');
  const [eventPublic, setEventPublic] = useState(true);
  const [skipEvent, setSkipEvent] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.getSetupStatus(token).then((status) => {
      if (status.completed) {
        navigate('/admin');
        return;
      }
      setStep(status.currentStep);
      const d = status.data as Record<string, Record<string, unknown>>;
      if (d.organization) {
        setOrgName(String(d.organization.name ?? ''));
        setOrgType(String(d.organization.type ?? 'verein'));
        setOrgDescription(String(d.organization.description ?? ''));
        setLogoUrl(String(d.organization.logoUrl ?? ''));
      }
      if (user) {
        setAdminFirstName(user.firstName);
        setAdminLastName(user.lastName);
        setAdminEmail(user.email);
      }
    }).finally(() => setLoading(false));
  }, [token, navigate, user]);

  const buildData = () => ({
    organization: { name: orgName, type: orgType, logoUrl, description: orgDescription },
    contact: { address, postalCode, city, country, phone, email: contactEmail, website, socialMedia },
    legal: { impressum, privacy, terms, revocation },
    admin: { firstName: adminFirstName, lastName: adminLastName, email: adminEmail, locale, timezone },
    event: skipEvent ? { skipped: true } : {
      name: eventName, date: eventDate, description: eventDescription,
      orderStartTime: orderStart, orderEndTime: orderEnd,
      pickupStartTime: pickupStart, pickupEndTime: pickupEnd,
      isPublic: eventPublic,
    },
  });

  const next = async () => {
    if (!token) return;
    setError('');
    try {
      if (step === 1 && !orgName.trim()) {
        setError('Bitte Organisationsnamen eingeben');
        return;
      }
      const nextStep = step + 1;
      await api.saveSetupStep(token, nextStep, buildData());
      if (step < STEPS.length - 1) {
        setStep(nextStep);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  };

  const finish = async () => {
    if (!token) return;
    setError('');
    try {
      await api.completeSetup(token, buildData());
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    }
  };

  if (loading) return null;

  return (
    <AdminLayout title="Einrichtungsassistent">
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Willkommen bei FestSchmiede! In wenigen Schritten richten Sie Ihren Mandanten ein.
      </Typography>
      <Stepper activeStep={step} sx={{ mb: 4 }} alternativeLabel>
        {STEPS.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 3, maxWidth: 640 }}>
        {step === 0 && (
          <Stack spacing={2}>
            <Typography variant="h6">Willkommen bei FestSchmiede</Typography>
            <Typography>
              FestSchmiede ist eine Plattform für Veranstaltungen mit Online-Bestellung,
              Küchenmanagement und Abholung. Dieser Assistent hilft Ihnen bei der Ersteinrichtung.
            </Typography>
          </Stack>
        )}
        {step === 1 && (
          <Stack spacing={2}>
            <TextField label="Name" fullWidth required value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            <FormControl>
              <FormLabel>Organisationstyp</FormLabel>
              <RadioGroup value={orgType} onChange={(e) => setOrgType(e.target.value)}>
                {ORG_TYPES.map((t) => (
                  <FormControlLabel key={t.value} value={t.value} control={<Radio />} label={t.label} />
                ))}
              </RadioGroup>
            </FormControl>
            <TextField label="Logo-URL" fullWidth value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
            <TextField label="Beschreibung" fullWidth multiline rows={3} value={orgDescription} onChange={(e) => setOrgDescription(e.target.value)} />
          </Stack>
        )}
        {step === 2 && (
          <Stack spacing={2}>
            <TextField label="Adresse" fullWidth value={address} onChange={(e) => setAddress(e.target.value)} />
            <Stack direction="row" spacing={2}>
              <TextField label="PLZ" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} sx={{ width: 120 }} />
              <TextField label="Ort" fullWidth value={city} onChange={(e) => setCity(e.target.value)} />
            </Stack>
            <TextField label="Land" fullWidth value={country} onChange={(e) => setCountry(e.target.value)} />
            <TextField label="Telefon" fullWidth value={phone} onChange={(e) => setPhone(e.target.value)} />
            <TextField label="E-Mail" type="email" fullWidth value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            <TextField label="Webseite" fullWidth value={website} onChange={(e) => setWebsite(e.target.value)} />
            <TextField label="Social Media (optional)" fullWidth value={socialMedia} onChange={(e) => setSocialMedia(e.target.value)} />
          </Stack>
        )}
        {step === 3 && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">Optional – kann später gepflegt werden.</Typography>
            <TextField label="Impressum" fullWidth multiline rows={2} value={impressum} onChange={(e) => setImpressum(e.target.value)} />
            <TextField label="Datenschutz" fullWidth multiline rows={2} value={privacy} onChange={(e) => setPrivacy(e.target.value)} />
            <TextField label="AGB" fullWidth multiline rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
            <TextField label="Widerruf" fullWidth multiline rows={2} value={revocation} onChange={(e) => setRevocation(e.target.value)} />
          </Stack>
        )}
        {step === 4 && (
          <Stack spacing={2}>
            <TextField label="Vorname" fullWidth value={adminFirstName} onChange={(e) => setAdminFirstName(e.target.value)} />
            <TextField label="Nachname" fullWidth value={adminLastName} onChange={(e) => setAdminLastName(e.target.value)} />
            <TextField label="E-Mail" type="email" fullWidth value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
            <TextField label="Sprache" fullWidth value={locale} onChange={(e) => setLocale(e.target.value)} />
            <TextField label="Zeitzone" fullWidth value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </Stack>
        )}
        {step === 5 && (
          <Stack spacing={2}>
            <FormControlLabel control={<Checkbox checked={skipEvent} onChange={(e) => setSkipEvent(e.target.checked)} />} label="Veranstaltung überspringen" />
            {!skipEvent && (
              <>
                <TextField label="Name" fullWidth value={eventName} onChange={(e) => setEventName(e.target.value)} />
                <TextField label="Datum" type="date" fullWidth value={eventDate} onChange={(e) => setEventDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                <TextField label="Beschreibung" fullWidth multiline rows={2} value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} />
                <Divider>Bestellzeiten</Divider>
                <Stack direction="row" spacing={2}>
                  <TextField label="Von" type="time" value={orderStart} onChange={(e) => setOrderStart(e.target.value)} InputLabelProps={{ shrink: true }} />
                  <TextField label="Bis" type="time" value={orderEnd} onChange={(e) => setOrderEnd(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Stack>
                <Divider>Abholzeiten</Divider>
                <Stack direction="row" spacing={2}>
                  <TextField label="Von" type="time" value={pickupStart} onChange={(e) => setPickupStart(e.target.value)} InputLabelProps={{ shrink: true }} />
                  <TextField label="Bis" type="time" value={pickupEnd} onChange={(e) => setPickupEnd(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Stack>
                <FormControlLabel control={<Checkbox checked={eventPublic} onChange={(e) => setEventPublic(e.target.checked)} />} label="Öffentlich" />
              </>
            )}
          </Stack>
        )}
        {step === 6 && (
          <Stack spacing={2}>
            <Alert severity="success">Zusammenfassung – Ihre Konfiguration ist bereit.</Alert>
            <Typography><strong>Organisation:</strong> {orgName} ({ORG_TYPES.find((t) => t.value === orgType)?.label})</Typography>
            {contactEmail && <Typography><strong>Kontakt:</strong> {contactEmail}</Typography>}
            {adminEmail && <Typography><strong>Administrator:</strong> {adminFirstName} {adminLastName} ({adminEmail})</Typography>}
            {!skipEvent && eventName && <Typography><strong>Veranstaltung:</strong> {eventName} am {eventDate}</Typography>}
          </Stack>
        )}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          {step === 5 && !skipEvent && (
            <Button onClick={() => { setSkipEvent(true); void next(); }}>Überspringen</Button>
          )}
          <Button variant="contained" onClick={() => void (step === STEPS.length - 1 ? finish() : next())}>
            {step === STEPS.length - 1 ? 'Konfiguration speichern' : 'Weiter'}
          </Button>
        </Box>
      </Paper>
    </AdminLayout>
  );
}
