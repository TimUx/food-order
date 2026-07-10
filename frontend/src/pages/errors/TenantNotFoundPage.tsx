import { Container, Typography, Button } from '@mui/material';
import { useRouting } from '@/contexts/RoutingProvider';

export function TenantNotFoundPage() {
  const { routing } = useRouting();

  return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Veranstalter nicht gefunden
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Der angeforderte Veranstalter existiert nicht oder ist derzeit nicht erreichbar.
        {routing.tenantSlug ? ` („${routing.tenantSlug}")` : ''}
      </Typography>
      <Button component="a" href={routing.platformUrl} variant="contained">
        Zur Plattform
      </Button>
    </Container>
  );
}
