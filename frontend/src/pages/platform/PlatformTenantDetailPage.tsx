import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import EmailIcon from '@mui/icons-material/Email';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import {
  platformApi,
  type PlatformTenant,
  type UpdatePlatformTenantPayload,
} from '@/services/platformApi';
import { PlatformTenantModulesSection } from './PlatformTenantModulesSection';

type TenantForm = {
  name: string;
  shortName: string;
  slug: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  description: string;
  logoUrl: string;
  locale: string;
  timezone: string;
  currency: string;
  theme: string;
};

function tenantToForm(tenant: PlatformTenant): TenantForm {
  return {
    name: tenant.name,
    shortName: tenant.shortName ?? '',
    slug: tenant.slug,
    contactName: tenant.contactName ?? '',
    email: tenant.email ?? '',
    phone: tenant.phone ?? '',
    address: tenant.address ?? '',
    website: tenant.website ?? '',
    description: tenant.description ?? '',
    logoUrl: tenant.logoUrl ?? '',
    locale: tenant.locale,
    timezone: tenant.timezone,
    currency: tenant.currency,
    theme: tenant.theme,
  };
}

function formToPayload(form: TenantForm): UpdatePlatformTenantPayload {
  const emptyToNull = (v: string) => (v.trim() === '' ? null : v.trim());
  const slug = form.slug.trim();
  return {
    name: form.name.trim(),
    shortName: emptyToNull(form.shortName),
    slug,
    subdomain: slug,
    contactName: emptyToNull(form.contactName),
    email: emptyToNull(form.email),
    phone: emptyToNull(form.phone),
    address: emptyToNull(form.address),
    website: emptyToNull(form.website),
    description: emptyToNull(form.description),
    logoUrl: emptyToNull(form.logoUrl),
    locale: form.locale.trim(),
    timezone: form.timezone.trim(),
    currency: form.currency.trim(),
    theme: form.theme.trim(),
  };
}

export function PlatformTenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = usePlatformAuth();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<PlatformTenant | null>(null);
  const [form, setForm] = useState<TenantForm | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingInfo, setSendingInfo] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    if (!token || !id) return;
    setLoading(true);
    platformApi
      .getTenant(token, id)
      .then((t) => {
        setTenant(t);
        setForm(tenantToForm(t));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [token, id]);

  const setField = (key: keyof TenantForm, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!token || !id || !form) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await platformApi.updateTenant(token, id, formToPayload(form));
      setTenant(updated);
      setForm(tenantToForm(updated));
      setEditing(false);
      setMessage('Mandant gespeichert.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (tenant) setForm(tenantToForm(tenant));
    setEditing(false);
    setError('');
  };

  const handleResendAccessInfo = async () => {
    if (!token || !id) return;
    setSendingInfo(true);
    setError('');
    setMessage('');
    try {
      const result = await platformApi.resendTenantAccessInfo(token, id);
      setMessage(
        result.adminCreated
          ? `Zugangsdaten wurden an ${result.email} gesendet (Administrator neu angelegt).`
          : `Zugangsdaten wurden erneut an ${result.email} gesendet. Das Passwort wurde zurückgesetzt.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'E-Mail konnte nicht gesendet werden');
    } finally {
      setSendingInfo(false);
    }
  };

  if (loading) return <CircularProgress />;
  if (!tenant || !form) return <Typography>Mandant nicht gefunden</Typography>;

  const actions = [
    { label: 'Aktivieren', fn: () => platformApi.activateTenant(token!, id!), show: tenant.status !== 'ACTIVE' },
    { label: 'Sperren', fn: () => platformApi.suspendTenant(token!, id!), show: tenant.status === 'ACTIVE' },
    { label: 'Archivieren', fn: () => platformApi.archiveTenant(token!, id!), show: tenant.status !== 'ARCHIVED' },
    {
      label: 'Exportieren',
      fn: async () => {
        const data = await platformApi.exportTenant(token!, id!);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tenant-${tenant.slug}-export.json`;
        a.click();
      },
      show: true,
    },
  ];

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/platform/mandanten')} sx={{ mb: 2 }}>
        Zurück
      </Button>

      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={2}>
        <Box>
          <Typography variant="h4" gutterBottom>{tenant.name}</Typography>
          <Chip label={tenant.status} />
        </Box>
        {!editing ? (
          <Button variant="contained" startIcon={<EditIcon />} onClick={() => setEditing(true)}>
            Bearbeiten
          </Button>
        ) : (
          <Box display="flex" gap={1}>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
              Speichern
            </Button>
            <Button variant="outlined" startIcon={<CancelIcon />} onClick={handleCancelEdit} disabled={saving}>
              Abbrechen
            </Button>
          </Box>
        )}
      </Box>

      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Organisation</Typography>
            {editing ? (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth label="Name" required value={form.name} onChange={(e) => setField('name', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth label="Kurzname" value={form.shortName} onChange={(e) => setField('shortName', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth label="Beschreibung" multiline minRows={3} value={form.description} onChange={(e) => setField('description', e.target.value)} />
                </Grid>
              </Grid>
            ) : (
              <>
                <InfoRow label="Name" value={tenant.name} />
                <InfoRow label="Kurzname" value={tenant.shortName ?? '–'} />
                <InfoRow label="Beschreibung" value={tenant.description ?? '–'} multiline />
              </>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Ansprechpartner & Kontakt</Typography>
            {editing ? (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth label="Ansprechpartner" value={form.contactName} onChange={(e) => setField('contactName', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="E-Mail" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Telefon" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth label="Adresse" multiline minRows={2} value={form.address} onChange={(e) => setField('address', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth label="Website" value={form.website} onChange={(e) => setField('website', e.target.value)} />
                </Grid>
              </Grid>
            ) : (
              <>
                <InfoRow label="Ansprechpartner" value={tenant.contactName ?? '–'} />
                <InfoRow label="E-Mail" value={tenant.email ?? '–'} />
                <InfoRow label="Telefon" value={tenant.phone ?? '–'} />
                <InfoRow label="Adresse" value={tenant.address ?? '–'} multiline />
                <InfoRow label="Website" value={tenant.website ?? '–'} />
              </>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Technisch</Typography>
            {editing ? (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth label="Slug (URL-Pfad)" required value={form.slug} onChange={(e) => setField('slug', e.target.value)} helperText="z. B. mein-verein → /mein-verein/…" />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Sprache" value={form.locale} onChange={(e) => setField('locale', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Zeitzone" value={form.timezone} onChange={(e) => setField('timezone', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Währung" value={form.currency} onChange={(e) => setField('currency', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label="Theme" value={form.theme} onChange={(e) => setField('theme', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth label="Logo-URL" value={form.logoUrl} onChange={(e) => setField('logoUrl', e.target.value)} />
                </Grid>
              </Grid>
            ) : (
              <>
                <InfoRow label="Pfad (Slug)" value={tenant.slug} />
                <InfoRow label="Sprache" value={tenant.locale} />
                <InfoRow label="Zeitzone" value={tenant.timezone} />
                <InfoRow label="Währung" value={tenant.currency} />
                <InfoRow label="Theme" value={tenant.theme} />
                <InfoRow label="Logo" value={tenant.logoUrl ?? '–'} />
              </>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Statistik</Typography>
            <InfoRow label="Aktive Benutzer" value={String(tenant.stats?.activeUsers ?? 0)} />
            <InfoRow label="Veranstaltungen" value={String(tenant.stats?.events ?? 0)} />
            <InfoRow label="Aktive Events" value={String(tenant.stats?.activeEvents ?? 0)} />
            <InfoRow label="Module aktiv" value={String(tenant.stats?.modules ?? 0)} />
            <InfoRow label="Bestellungen" value={String(tenant.stats?.ordersTotal ?? 0)} />
            <Divider sx={{ my: 1 }} />
            <InfoRow label="Erstellt" value={new Date(tenant.createdAt).toLocaleString('de-DE')} />
            {tenant.updatedAt && (
              <InfoRow label="Geändert" value={new Date(tenant.updatedAt).toLocaleString('de-DE')} />
            )}
          </Paper>
        </Grid>
      </Grid>

      {token && id && <PlatformTenantModulesSection token={token} tenantId={id} />}

      <Divider sx={{ my: 3 }} />
      <Box display="flex" gap={1} flexWrap="wrap">
        <Button
          variant="contained"
          startIcon={sendingInfo ? <CircularProgress size={18} color="inherit" /> : <EmailIcon />}
          onClick={() => void handleResendAccessInfo()}
          disabled={sendingInfo || !tenant.email || tenant.status === 'ARCHIVED'}
        >
          Infos senden
        </Button>
        {actions.filter((a) => a.show).map((a) => (
          <Button
            key={a.label}
            variant="outlined"
            onClick={async () => {
              await a.fn();
              load();
            }}
          >
            {a.label}
          </Button>
        ))}
        <Button
          color="error"
          variant="outlined"
          onClick={async () => {
            if (
              confirm(
                'Mandant unwiderruflich löschen? Alle mandantenspezifischen Daten (Veranstaltungen, Bestellungen, Benutzer, Einstellungen, Gerichte, Uploads) werden dauerhaft aus der Datenbank entfernt (DSGVO).'
              )
            ) {
              await platformApi.deleteTenant(token!, id!);
              navigate('/platform/mandanten');
            }
          }}
        >
          Löschen
        </Button>
      </Box>
    </Box>
  );
}

function InfoRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <Box display="flex" justifyContent="space-between" gap={2} py={0.75} flexDirection={multiline ? 'column' : 'row'}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={multiline ? { whiteSpace: 'pre-wrap' } : undefined} textAlign={multiline ? 'left' : 'right'}>
        {value}
      </Typography>
    </Box>
  );
}
