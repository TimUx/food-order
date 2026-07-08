import { Link } from 'react-router-dom';
import { Typography, Grid, Card, CardActionArea, CardContent, Box } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import EventIcon from '@mui/icons-material/Event';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import EmailIcon from '@mui/icons-material/Email';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { AdminLayout } from '@/components/AdminLayout';

const tiles = [
  { path: '/admin/verein', label: 'Verein & Kontakt', description: 'Name, Logo, Kontaktdaten', icon: <SettingsIcon fontSize="large" color="primary" /> },
  { path: '/admin/benutzer', label: 'Benutzer', description: 'Mitarbeiter und Administratoren', icon: <PeopleIcon fontSize="large" color="primary" /> },
  { path: '/admin/veranstaltungen', label: 'Veranstaltungen', description: 'Events anlegen und aktivieren', icon: <EventIcon fontSize="large" color="primary" /> },
  { path: '/admin/speisen', label: 'Speisen', description: 'Speisekarte pflegen', icon: <RestaurantMenuIcon fontSize="large" color="primary" /> },
  { path: '/admin/bestellung', label: 'Bestellung', description: 'Pflichtfelder & Stornierungsfrist', icon: <ShoppingCartIcon fontSize="large" color="primary" /> },
  { path: '/admin/email', label: 'E-Mail', description: 'SMTP-Server für Bestätigungsmails', icon: <EmailIcon fontSize="large" color="primary" /> },
  { path: '/mitarbeiter', label: 'Mitarbeiterbereich', description: 'Küche, Abholung, Bestellungen', icon: <StorefrontIcon fontSize="large" color="secondary" /> },
];

export function AdminDashboardPage() {
  return (
    <AdminLayout title="Administration">
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Administration
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Verein, Benutzer und Veranstaltungen verwalten.
      </Typography>
      <Grid container spacing={2}>
        {tiles.map((tile) => (
          <Grid key={tile.path} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card>
              <CardActionArea component={Link} to={tile.path} sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ mb: 1 }}>{tile.icon}</Box>
                  <Typography variant="h6" fontWeight={700}>{tile.label}</Typography>
                  <Typography variant="body2" color="text.secondary">{tile.description}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </AdminLayout>
  );
}
