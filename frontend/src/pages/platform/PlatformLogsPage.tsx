import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, CircularProgress } from '@mui/material';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { platformApi } from '@/services/platformApi';

export function PlatformLogsPage() {
  const { token } = usePlatformAuth();
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    platformApi.listLogs(token, { limit: 100 })
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Plattform-Logs</Typography>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Zeit</TableCell>
              <TableCell>Aktion</TableCell>
              <TableCell>Actor</TableCell>
              <TableCell>Mandant</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((log) => (
              <TableRow key={String(log.id)}>
                <TableCell>{new Date(String(log.createdAt)).toLocaleString('de-DE')}</TableCell>
                <TableCell>{String(log.action)}</TableCell>
                <TableCell>{String(log.actorId ?? '–')}</TableCell>
                <TableCell>{String(log.tenantId ?? '–')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
