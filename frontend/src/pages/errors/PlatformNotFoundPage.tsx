import { Button, Container, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

export function PlatformNotFoundPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Seite nicht gefunden
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Die angeforderte Plattformseite existiert nicht.
      </Typography>
      <Button component={Link} to="/" variant="contained">
        Zur Startseite
      </Button>
    </Container>
  );
}
