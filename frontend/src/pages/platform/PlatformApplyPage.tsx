import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Checkbox, FormControlLabel, Grid, MenuItem, TextField, Typography,
} from '@mui/material';
import { PlatformPublicLayout } from '@/components/PlatformPublicLayout';
import { BrandingHead } from '@/components/BrandingHead';
import { MarketingSection } from '@/components/marketing/MarketingLayout';
import { api, ApiError } from '@/services/api';
import { FormHintTextField } from '@/components/marketing/FormHintTextField';
import { TurnstileWidget } from '@/components/TurnstileWidget';
import { ORGANIZATION_TYPES } from '@/content/platformMarketing';
import { TENANT_APPLICATION_FIELD_HINTS } from '@/content/tenantApplicationHints';
import type { PlatformLegalLink } from '@/types/tenant';
import { Link } from 'react-router-dom';
import { usePlatform } from '@/contexts/PlatformProvider';
import { useRouting } from '@/contexts/RoutingProvider';
import {
  buildTenantApplicationPayload,
  formatValidationSummary,
  mapApiValidationErrors,
  resolveFieldHelperText,
  validateTenantApplicationForm,
  type TenantApplicationFieldErrors,
  type TenantApplicationFormKey,
} from '@/utils/tenantApplicationValidation';
import { formatTenantApplicationRateLimitMessage } from '@/utils/rateLimitMessage';

function normalizeSubdomainInput(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function normalizeWebsiteInput(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function parseOptionalInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return undefined;
  return Math.trunc(n);
}

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
  const formStartedAt = useRef(Date.now());
  const { platform } = usePlatform();
  const { routing } = useRouting();
  const [form, setForm] = useState(INITIAL);
  const [legalLinks, setLegalLinks] = useState<PlatformLegalLink[]>([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<TenantApplicationFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRequired = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);

  useEffect(() => {
    api.getPlatformLegalLinks().then((r) => setLegalLinks(r.items)).catch(() => setLegalLinks([]));
  }, []);

  const privacyLink = legalLinks.find((l) => l.pageType === 'datenschutz');
  const termsLink = legalLinks.find((l) => l.pageType === 'nutzungsbedingungen');

  const update = (key: keyof typeof INITIAL, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key as TenantApplicationFormKey]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key as TenantApplicationFormKey];
        return next;
      });
    }
  };

  const fieldProps = (key: TenantApplicationFormKey, value: string, extraHelper?: string) => ({
    error: Boolean(fieldErrors[key]),
    helperText: resolveFieldHelperText(key, value, fieldErrors[key], extraHelper),
    'data-field': key,
  });

  const scrollToFirstError = (errors: TenantApplicationFieldErrors) => {
    const firstKey = Object.keys(errors)[0];
    if (!firstKey) return;
    document.querySelector(`[data-field="${firstKey}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const requestedSubdomain = normalizeSubdomainInput(form.requestedSubdomain);
    const validationErrors = validateTenantApplicationForm(form, {
      requestedSubdomain,
      privacyAccepted: form.privacyAccepted,
      termsAccepted: form.termsAccepted,
    });

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError(formatValidationSummary(validationErrors));
      scrollToFirstError(validationErrors);
      return;
    }

    if (turnstileRequired && !turnstileToken) {
      setError('Bitte bestätigen Sie die Sicherheitsprüfung.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.submitTenantApplication(
        buildTenantApplicationPayload(
          form,
          requestedSubdomain,
          normalizeWebsiteInput,
          parseOptionalInt,
          {
            formStartedAt: formStartedAt.current,
            honeypot,
            turnstileToken: turnstileToken || undefined,
          }
        )
      );
      navigate(`/mandant-beantragen/bestaetigung?id=${result.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError(formatTenantApplicationRateLimitMessage(err.rateLimit));
      } else if (err instanceof ApiError && err.details?.length) {
        const apiFieldErrors = mapApiValidationErrors(err.details);
        setFieldErrors(apiFieldErrors);
        setError(formatValidationSummary(apiFieldErrors));
        scrollToFirstError(apiFieldErrors);
      } else {
        setError(err instanceof Error ? err.message : 'Bewerbung konnte nicht gesendet werden.');
      }
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
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                required
                fullWidth
                label="Organisation"
                value={form.organization}
                onChange={(e) => update('organization', e.target.value)}
                {...fieldProps('organization', form.organization)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                required
                fullWidth
                select
                label="Organisationstyp"
                value={form.organizationType}
                onChange={(e) => update('organizationType', e.target.value)}
                {...fieldProps('organizationType', form.organizationType)}
              >
                {ORGANIZATION_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                required
                fullWidth
                label="Ansprechpartner"
                value={form.contactName}
                onChange={(e) => update('contactName', e.target.value)}
                {...fieldProps('contactName', form.contactName)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                required
                fullWidth
                type="email"
                label="E-Mail"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                {...fieldProps('email', form.email)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                required
                fullWidth
                label="Straße"
                value={form.street}
                onChange={(e) => update('street', e.target.value)}
                {...fieldProps('street', form.street)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                required
                fullWidth
                label="PLZ"
                value={form.postalCode}
                onChange={(e) => update('postalCode', e.target.value)}
                {...fieldProps('postalCode', form.postalCode)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                required
                fullWidth
                label="Ort"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                {...fieldProps('city', form.city)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Land" value={form.country} onChange={(e) => update('country', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Telefon" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Website"
                value={form.website}
                onChange={(e) => update('website', e.target.value)}
                {...fieldProps('website', form.website)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                type="number"
                inputProps={{ min: 0 }}
                label="Anzahl Mitglieder"
                value={form.memberCount}
                onChange={(e) => update('memberCount', e.target.value)}
                {...fieldProps('memberCount', form.memberCount)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                type="number"
                inputProps={{ min: 0 }}
                label="Veranstaltungen pro Jahr"
                value={form.eventsPerYear}
                onChange={(e) => update('eventsPerYear', e.target.value)}
                {...fieldProps('eventsPerYear', form.eventsPerYear)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                required
                fullWidth
                label="Gewünschte Internetadresse"
                value={form.requestedSubdomain}
                onChange={(e) => update('requestedSubdomain', e.target.value)}
                {...fieldProps(
                  'requestedSubdomain',
                  form.requestedSubdomain,
                  `Beispiel: mein-verein → ${routing.appUrl}/mein-verein`
                )}
              />
            </Grid>
            <Grid size={12}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1 }}>
                Ihre Bewerbung im Detail
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Bitte beschreiben Sie Ihr Vorhaben möglichst konkret. Felder mit Mindestlänge zeigen einen Zeichenzähler;
                über das Hinweis-Symbol sehen Sie Beispiele.
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
                error={Boolean(fieldErrors.reason)}
                helperText={resolveFieldHelperText('reason', form.reason, fieldErrors.reason)}
                data-field="reason"
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
                error={Boolean(fieldErrors.desiredFeatures)}
                helperText={resolveFieldHelperText('desiredFeatures', form.desiredFeatures, fieldErrors.desiredFeatures)}
                data-field="desiredFeatures"
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
                error={Boolean(fieldErrors.freeTierJustification)}
                helperText={resolveFieldHelperText(
                  'freeTierJustification',
                  form.freeTierJustification,
                  fieldErrors.freeTierJustification
                )}
                data-field="freeTierJustification"
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
                error={Boolean(fieldErrors.plannedUsage)}
                helperText={resolveFieldHelperText('plannedUsage', form.plannedUsage, fieldErrors.plannedUsage)}
                data-field="plannedUsage"
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
                error={Boolean(fieldErrors.notes)}
                helperText={fieldErrors.notes}
                data-field="notes"
              />
            </Grid>
            {(fieldErrors.privacyAccepted || fieldErrors.termsAccepted) && (
              <Grid size={12}>
                <Alert severity="warning">
                  {[fieldErrors.privacyAccepted, fieldErrors.termsAccepted].filter(Boolean).join(' ')}
                </Alert>
              </Grid>
            )}
            <Grid size={12}>
              <FormControlLabel
                control={<Checkbox checked={form.privacyAccepted} onChange={(e) => update('privacyAccepted', e.target.checked)} />}
                label={privacyLink ? (
                  <Typography variant="body2">
                    <Link to={`/rechtliches/${privacyLink.slug}`} target="_blank">Datenschutzerklärung</Link> gelesen
                  </Typography>
                ) : 'Datenschutzerklärung gelesen'}
              />
              <FormControlLabel
                control={<Checkbox checked={form.termsAccepted} onChange={(e) => update('termsAccepted', e.target.checked)} />}
                label={termsLink ? (
                  <Typography variant="body2">
                    <Link to={`/rechtliches/${termsLink.slug}`} target="_blank">Nutzungsbedingungen</Link> akzeptiert
                  </Typography>
                ) : 'Nutzungsbedingungen akzeptiert'}
              />
            </Grid>
            <Box
              aria-hidden="true"
              sx={{
                position: 'absolute',
                left: -10000,
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0,0,0,0)',
                whiteSpace: 'nowrap',
                border: 0,
              }}
            >
              Website
              <input
                type="text"
                name="company_website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </Box>
            {turnstileRequired && (
              <Grid size={12}>
                <TurnstileWidget
                  onVerify={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                />
              </Grid>
            )}
            <Grid size={12}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting || (turnstileRequired && !turnstileToken)}
              >
                {submitting ? 'Wird gesendet…' : 'Bewerbung absenden'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </MarketingSection>
    </PlatformPublicLayout>
  );
}
