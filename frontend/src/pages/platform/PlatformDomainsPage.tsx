import { useEffect, useState } from 'react';
import {
  Alert, Box, Chip, CircularProgress, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { platformApi, type PlatformDomainsInfo } from '@/services/platformApi';

export function PlatformDomainsPage() {
  const { token } = usePlatformAuth();
  const [domains, setDomains] = useState<PlatformDomainsInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    platformApi.getDomains(token).then(setDomains).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <CircularProgress />;
  if (!domains) return <Alert severity="error">Domain-Konfiguration konnte nicht geladen werden.</Alert>;

  const rows = [
    { label: 'Basis-Domain', value: domains.baseDomain },
    { label: 'WWW-Subdomain', value: domains.wwwSubdomain },
    { label: 'WWW-Domain', value: domains.wwwDomain },
    { label: 'APP-Subdomain', value: domains.appSubdomain },
    { label: 'APP-Domain', value: domains.appDomain },
    { label: 'Mandanten-Wildcard', value: domains.wildcardDomain },
    { label: 'Mandanten-Muster', value: domains.tenantDomainPattern },
    { label: 'API-Domain', value: domains.apiDomain ?? '– (APP-Domain)' },
    { label: 'Docs-Domain', value: domains.docsDomain ?? '– (WWW)' },
    { label: 'Status-Domain', value: domains.statusDomain ?? '– (APP)' },
    { label: 'Cookie-Domain', value: domains.cookieDomain ?? '–' },
    { label: 'Session-Domain', value: domains.sessionDomain ?? '–' },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Domain &amp; Routing</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Übersicht der aktiven Domain- und Routing-Konfiguration. Technisch kritische Werte werden über
        Docker/ENV gesetzt und sind hier schreibgeschützt.
      </Typography>
      <Chip label="Quelle: Infrastruktur (ENV)" size="small" sx={{ mb: 2 }} />
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Einstellung</TableCell>
              <TableCell>Wert</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.label}>
                <TableCell>{r.label}</TableCell>
                <TableCell><code>{r.value}</code></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      {domains.reservedSubdomains && domains.reservedSubdomains.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>Reservierte Subdomains</Typography>
          <Typography component="div" color="text.secondary">
            {domains.reservedSubdomains.map((d) => (
              <Chip key={d} label={d} size="small" sx={{ mr: 1, mb: 1 }} />
            ))}
          </Typography>
        </Box>
      )}
      {domains.allowedDomains && domains.allowedDomains.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>Vertrauenswürdige Hosts</Typography>
          <Typography component="div" color="text.secondary">
            {domains.allowedDomains.map((d) => (
              <Chip key={d} label={d} size="small" sx={{ mr: 1, mb: 1 }} />
            ))}
          </Typography>
        </Box>
      )}
      {domains.allowedOrigins && domains.allowedOrigins.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>CORS (Allowed Origins)</Typography>
          <Typography component="div" color="text.secondary">
            {domains.allowedOrigins.map((d) => (
              <Chip key={d} label={d} size="small" sx={{ mr: 1, mb: 1 }} />
            ))}
          </Typography>
        </Box>
      )}
      {domains.note && (
        <Alert severity="info" sx={{ mt: 3 }}>{domains.note}</Alert>
      )}
    </Box>
  );
}
