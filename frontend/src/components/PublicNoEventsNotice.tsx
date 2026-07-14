import {
  Avatar,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link } from 'react-router-dom';
import { useClub } from '@/contexts/ClubContext';
import { getImageUrl } from '@/services/api';
import { touchButtonSx } from '@/theme/touch';

export type PublicNoOrderReason = 'no-events' | 'no-menu' | 'unavailable';

interface PublicNoEventsNoticeProps {
  reason?: PublicNoOrderReason;
  eventName?: string;
  onBack?: () => void;
}

function getMessage(reason: PublicNoOrderReason, clubName: string, eventName?: string): {
  title: string;
  body: string;
} {
  switch (reason) {
    case 'no-menu':
      return {
        title: 'Speisekarte noch nicht verfügbar',
        body: eventName
          ? `Für „${eventName}" sind derzeit noch keine Gerichte für die Online-Bestellung hinterlegt. Schauen Sie später noch einmal vorbei oder wenden Sie sich direkt an ${clubName}.`
          : `${clubName} hat für die ausgewählte Veranstaltung derzeit noch keine Gerichte für die Online-Bestellung hinterlegt.`,
      };
    case 'unavailable':
      return {
        title: 'Bestellungen derzeit nicht möglich',
        body: `Online-Bestellungen bei ${clubName} sind im Moment leider nicht verfügbar. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns direkt.`,
      };
    default:
      return {
        title: 'Derzeit keine Veranstaltungen',
        body: `${clubName} hat aktuell keine Veranstaltungen mit Online-Bestellung eingeplant. Sobald ein neues Fest oder eine Veranstaltung angekündigt wird, können Sie hier bequem vorbestellen.`,
      };
  }
}

export function PublicNoEventsNotice({
  reason = 'no-events',
  eventName,
  onBack,
}: PublicNoEventsNoticeProps) {
  const { club } = useClub();
  const logoUrl = getImageUrl(club.logoUrl || undefined);
  const { title, body } = getMessage(reason, club.clubName, eventName);

  return (
    <Paper
      sx={{
        p: { xs: 3, sm: 4 },
        maxWidth: 640,
        mx: 'auto',
        textAlign: 'center',
      }}
    >
      <Stack spacing={3} alignItems="center">
        {onBack && (
          <Box sx={{ alignSelf: 'flex-start', width: '100%' }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={onBack}
              sx={touchButtonSx}
            >
              Veranstaltung wechseln
            </Button>
          </Box>
        )}

        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          {logoUrl ? (
            <Avatar src={logoUrl} alt={club.clubName} sx={{ width: 88, height: 88 }} />
          ) : (
            <Avatar sx={{ width: 88, height: 88, bgcolor: 'primary.main' }}>
              <RestaurantMenuIcon sx={{ fontSize: 44 }} />
            </Avatar>
          )}
          <Box
            sx={{
              position: 'absolute',
              right: -6,
              bottom: -6,
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: 'background.paper',
              border: 2,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <EventBusyIcon color="action" />
          </Box>
        </Box>

        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.2 }}>
            {club.clubName}
          </Typography>
          <Typography variant="h4" fontWeight={800} gutterBottom sx={{ mt: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            {body}
          </Typography>
        </Box>

        <Button
          component={Link}
          to="/kontakt"
          variant="contained"
          startIcon={<ContactMailIcon />}
          sx={{ ...touchButtonSx, minWidth: 220 }}
        >
          Kontakt aufnehmen
        </Button>
      </Stack>
    </Paper>
  );
}
