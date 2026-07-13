import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Checkbox, FormControlLabel, Grid, MenuItem, TextField, Typography,
} from '@mui/material';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';
import { MarketingSection } from '@/components/marketing/MarketingLayout';
import { api } from '@/services/api';
import { FormHintTextField } from '@/components/marketing/FormHintTextField';
import { ORGANIZATION_TYPES } from '@/content/platformMarketing';
import { TENANT_APPLICATION_FIELD_HINTS } from '@/content/tenantApplicationHints';
import type { PlatformLegalLink } from '@/types/tenant';
import { Link } from 'react-router-dom';
import { usePlatform } from '@/contexts/PlatformProvider';
import { useRouting } from '@/contexts/RoutingProvider';

const INITIAL = {
  organization: '',
  organizationType: 'Verein',
  contactName: '',
  street: '',
  postalCode: '',
  city: '',
  country: 'Deutschland',
  email: '',
  phone: '',
  website: '',
  memberCount: '',
  eventsPerYear: '',
  reason: '',
  desiredFeatures: '',
  freeTierJustification: '',
  plannedUsage: '',
  notes: '',
  requestedSubdomain: '',
  privacyAccepted: false,
  termsAccepted: false,
};

export function PlatformApplyPage() {
  const navigate = useNavigate();
  const { platform } = usePlatform();
  const { routing } = useRouting();
  const [form, setForm] = useState(INITIAL);
  const [legalLinks, setLegalLinks] = useState<PlatformLegalLink[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getPlatformLegalLinks().then((r) => setLegalLinks(r.items)).catch(() => setLegalLinks([]));
  }, []);

  const privacyLink = legalLinks.find((l) => l.pageType === 'datenschutz');
  const termsLink = legalLinks.find((l) => l.pageType === 'nutzungsbedingungen');

  const update = (key: keyof typeof INITIAL, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.privacyAccepted || !form.termsAccepted) {
      setError('Bitte Datenschutz und Nutzungsbedingungen akzeptieren.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.submitTenantApplication({
        organization: form.organization,
        organizationType: form.organizationType,
        contactName: form.contactName,
        street: form.street,
        postalCode: form.postalCode,
        city: form.city,
        country: form.country || undefined,
        email: form.email,
        phone: form.phone || undefined,
        website: form.website || undefined,
        memberCount: form.memberCount ? Number(form.memberCount) : undefined,
        eventsPerYear: form.eventsPerYear ? Number(form.eventsPerYear) : undefined,
        reason: form.reason,
        desiredFeatures: form.desiredFeatures,
        freeTierJustification: form.freeTierJustification,
        plannedUsage: form.plannedUsage,
        notes: form.notes || undefined,
        requestedSubdomain: form.requestedSubdomain,
        privacyAccepted: true,
        termsAccepted: true,
      });
      navigate(`/mandant-beantragen/bestaetigung?id=${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bewerbung konnte nicht gesendet werden.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!platform.registrationEnabled) {
    return (
      <PlatformPublicLayout>
        <BrandingHead titleSuffix="Mandant beantragen" path="/mandant-beantragen" />
        <MarketingSection title="Mandant beantragen">
          <Alert severity="info">
            Bewerbungen sind derzeit nicht freigeschaltet. Plattformadministratoren können sie unter{' '}
            <strong>Plattform → Einstellungen → Mandantenbewerbungen aktiv</strong> einschalten.
            Alternativ erreichen Sie uns über die <Link to="/kontakt">Kontaktseite</Link>.
          </Alert>
        </MarketingSection>
      </PlatformPublicLayout>
    );
  }

  return (
    <PlatformPublicLayout>
      <BrandingHead titleSuffix="Mandant beantragen" path="/mandant-beantragen" />
      <MarketingSection title="Mandant beantragen" subtitle="Stellen Sie eine Bewerbung für einen FestSchmiede-Mandanten.">
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}><TextField required fullWidth label="Organisation" value={form.organization} onChange={(e) => update('organization', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required fullWidth select label="Organisationstyp" value={form.organizationType} onChange={(e) => update('organizationType', e.target.value)}>
                {ORGANIZATION_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField required fullWidth label="Ansprechpartner" value={form.contactName} onChange={(e) => update('contactName', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField required fullWidth type="email" label="E-Mail" value={form.email} onChange={(e) => update('email', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 8 }}><TextField required fullWidth label="Straße" value={form.street} onChange={(e) => update('street', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 2 }}><TextField required fullWidth label="PLZ" value={form.postalCode} onChange={(e) => update('postalCode', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 2 }}><TextField required fullWidth label="Ort" value={form.city} onChange={(e) => update('city', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Land" value={form.country} onChange={(e) => update('country', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Telefon" value={form.phone} onChange={(e) => update('phone', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Website" value={form.website} onChange={(e) => update('website', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth type="number" label="Anzahl Mitglieder" value={form.memberCount} onChange={(e) => update('memberCount', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth type="number" label="Veranstaltungen pro Jahr" value={form.eventsPerYear} onChange={(e) => update('eventsPerYear', e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                required
                fullWidth
                label="Gewünschte Internetadresse"
                helperText={`Der Name in Ihrer Adresse, z. B. mein-verein → ${routing.appUrl}/mein-verein`}
                value={form.requestedSubdomain}
                onChange={(e) => update('requestedSubdomain', e.target.value)}
              />
            </Grid>
            <Grid size={12}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1 }}>
                Ihre Bewerbung im Detail
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Bitte beschreiben Sie Ihr Vorhaben möglichst konkret. Über das Hinweis-Symbol neben jedem Feld sehen Sie Beispiele.
              </Typography>
            </Grid>
            <Grid size={12}>
              <FormHintTextField
                required
                fullWidth
                multiline
                minRows={3}
                label="Warum wird FestSchmiede benötigt?"
                hint={TENANT_APPLICATION_FIELD_HINTS.reason}
                value={form.reason}
                onChange={(e) => update('reason', e.target.value)}
              />
            </Grid>
            <Grid size={12}>
              <FormHintTextField
                required
                fullWidth
                multiline
                minRows={2}
                label="Welche Funktionen sollen genutzt werden?"
                hint={TENANT_APPLICATION_FIELD_HINTS.desiredFeatures}
                value={form.desiredFeatures}
                onChange={(e) => update('desiredFeatures', e.target.value)}
              />
            </Grid>
            <Grid size={12}>
              <FormHintTextField
                required
                fullWidth
                multiline
                minRows={2}
                label="Warum sollte ein kostenloser Mandant bereitgestellt werden?"
                hint={TENANT_APPLICATION_FIELD_HINTS.freeTierJustification}
                value={form.freeTierJustification}
                onChange={(e) => update('freeTierJustification', e.target.value)}
              />
            </Grid>
            <Grid size={12}>
              <FormHintTextField
                required
                fullWidth
                multiline
                minRows={2}
                label="Geplante Nutzung"
                hint={TENANT_APPLICATION_FIELD_HINTS.plannedUsage}
                value={form.plannedUsage}
                onChange={(e) => update('plannedUsage', e.target.value)}
              />
            </Grid>
            <Grid size={12}>
              <FormHintTextField
                fullWidth
                multiline
                minRows={2}
                label="Bemerkungen"
                hint={TENANT_APPLICATION_FIELD_HINTS.notes}
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
              />
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={<Checkbox checked={form.privacyAccepted} onChange={(e) => update('privacyAccepted', e.target.checked)} required />}
                label={privacyLink ? (
                  <Typography variant="body2">
                    <Link to={`/rechtliches/${privacyLink.slug}`} target="_blank">Datenschutzerklärung</Link> gelesen
                  </Typography>
                ) : 'Datenschutzerklärung gelesen'}
              />
              <FormControlLabel
                control={<Checkbox checked={form.termsAccepted} onChange={(e) => update('termsAccepted', e.target.checked)} required />}
                label={termsLink ? (
                  <Typography variant="body2">
                    <Link to={`/rechtliches/${termsLink.slug}`} target="_blank">Nutzungsbedingungen</Link> akzeptiert
                  </Typography>
                ) : 'Nutzungsbedingungen akzeptiert'}
              />
            </Grid>
            <Grid size={12}>
              <Button type="submit" variant="contained" size="large" disabled={submitting}>
                {submitting ? 'Wird gesendet…' : 'Bewerbung absenden'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </MarketingSection>
    </PlatformPublicLayout>
  );
}
