import {
  Typography,
  Paper,
  Stack,
  Link as MuiLink,
  Box,
  Avatar,
  Divider,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LanguageIcon from '@mui/icons-material/Language';
import PersonIcon from '@mui/icons-material/Person';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { Link } from 'react-router-dom';
import { PublicLayout } from '@/components/PublicLayout';
import { useClub } from '@/contexts/ClubContext';
import { getImageUrl } from '@/services/api';
import { Button } from '@mui/material';

export function ContactPage() {
  const { club } = useClub();
  const logoUrl = getImageUrl(club.logoUrl || undefined);

  return (
    <PublicLayout>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Kontakt
      </Typography>

      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          {logoUrl ? (
            <Avatar src={logoUrl} alt={club.clubName} sx={{ width: 64, height: 64 }} />
          ) : (
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>
              <RestaurantMenuIcon fontSize="large" />
            </Avatar>
          )}
          <Box>
            <Typography variant="h5" fontWeight={700}>{club.clubName}</Typography>
            {club.description && (
              <Typography variant="body2" color="text.secondary">{club.description}</Typography>
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Stack spacing={2}>
          {club.contactName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon color="action" />
              <Typography>{club.contactName}</Typography>
            </Box>
          )}
          {club.email && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmailIcon color="action" />
              <MuiLink href={`mailto:${club.email}`}>{club.email}</MuiLink>
            </Box>
          )}
          {club.phone && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PhoneIcon color="action" />
              <MuiLink href={`tel:${club.phone}`}>{club.phone}</MuiLink>
            </Box>
          )}
          {club.address && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <LocationOnIcon color="action" sx={{ mt: 0.3 }} />
              <Typography>{club.address}</Typography>
            </Box>
          )}
          {club.website && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LanguageIcon color="action" />
              <MuiLink href={club.website} target="_blank" rel="noopener noreferrer">
                {club.website}
              </MuiLink>
            </Box>
          )}
        </Stack>

        <Button component={Link} to="/" variant="outlined" sx={{ mt: 4 }}>
          Zur Bestellseite
        </Button>
      </Paper>
    </PublicLayout>
  );
}
