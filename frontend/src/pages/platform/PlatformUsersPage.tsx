import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, CircularProgress } from '@mui/material';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { platformApi } from '@/services/platformApi';

export function PlatformUsersPage() {
  const { token } = usePlatformAuth();
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    platformApi.listUsers(token)
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Plattformadministratoren</Typography>
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>E-Mail</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Letzter Login</TableCell>
              <TableCell>MFA</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((u) => (
              <TableRow key={String(u.id)}>
                <TableCell>{String(u.firstName)} {String(u.lastName)}</TableCell>
                <TableCell>{String(u.email)}</TableCell>
                <TableCell>{u.active ? 'Aktiv' : 'Inaktiv'}</TableCell>
                <TableCell>{u.lastLoginAt ? new Date(String(u.lastLoginAt)).toLocaleString('de-DE') : '–'}</TableCell>
                <TableCell>{u.mfaEnabled ? 'Vorbereitet' : '–'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
