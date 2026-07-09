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
    { label: 'WWW-Domain', value: domains.wwwDomain },
    { label: 'Mandanten-Domain', value: domains.tenantDomainPattern },
    { label: 'Wildcard-Domain', value: domains.wildcardDomain },
    { label: 'API-Domain', value: domains.apiDomain ?? '– (Basis-Domain)' },
    { label: 'Cookie-Domain', value: domains.cookieDomain ?? '–' },
    { label: 'Session-Domain', value: domains.sessionDomain ?? '–' },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Domains</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Anzeige der aktiven Domain-Konfiguration. Technisch kritische Werte werden über
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
      {domains.allowedDomains && domains.allowedDomains.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>Erlaubte Hosts</Typography>
          <Typography component="div" color="text.secondary">
            {domains.allowedDomains.map((d) => (
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
