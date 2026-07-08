import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Container,
  Avatar,
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { useThemeMode } from '@/contexts/ThemeContext';
import { useClub } from '@/contexts/ClubContext';
import { Link } from 'react-router-dom';
import { getImageUrl } from '@/services/api';

interface PublicLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  /** Kind füllt die verbleibende Viewport-Höhe (z. B. für scrollbare Bereiche mit Footer) */
  fillHeight?: boolean;
}

export function PublicLayout({ children, fullWidth = false, fillHeight = false }: PublicLayoutProps) {
  const { mode, toggleMode } = useThemeMode();
  const { club } = useClub();
  const logoUrl = getImageUrl(club.logoUrl || undefined);

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        height: fillHeight ? '100dvh' : 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AppBar position="fixed" elevation={1}>
        <Toolbar>
          {logoUrl ? (
            <Avatar src={logoUrl} alt={club.clubName} sx={{ width: 36, height: 36, mr: 1.5 }} />
          ) : (
            <RestaurantMenuIcon sx={{ mr: 1 }} />
          )}
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit', fontWeight: 700 }}
          >
            {club.clubName}
          </Typography>
          <IconButton onClick={toggleMode} color="inherit" aria-label="Design wechseln">
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <Container
        maxWidth={fullWidth ? false : 'md'}
        sx={{
          flexGrow: 1,
          py: 3,
          px: { xs: 2, sm: 3 },
          ...(fillHeight && {
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }),
        }}
      >
        {children}
      </Container>
    </Box>
  );
}
