import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Container,
  Avatar,
  Button,
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SearchIcon from '@mui/icons-material/Search';
import { FestSchmiedeLogo } from '@/components/FestSchmiedeLogo';
import { useThemeMode } from '@/contexts/ThemeContext';
import { useClub } from '@/contexts/ClubContext';
import { Link } from 'react-router-dom';
import { api, getImageUrl } from '@/services/api';
import { useEffect, useState } from 'react';
import type { PublicLegalLink } from '@/types/legal';

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
  const [legalLinks, setLegalLinks] = useState<PublicLegalLink[]>([]);

  useEffect(() => {
    let active = true;
    void api.getPublicLegalLinks()
      .then((data) => {
        if (active) setLegalLinks(data.links);
      })
      .catch(() => {
        if (active) setLegalLinks([]);
      });
    return () => { active = false; };
  }, []);

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
            <Avatar src={logoUrl} alt={club.clubName} sx={{ width: 48, height: 48, mr: 1.5 }} />
          ) : (
            <FestSchmiedeLogo size="header" variant="onPrimary" sx={{ mr: 1.5 }} />
          )}
          <Typography
            variant="h6"
            component={Link}
            to="/public"
            sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit', fontWeight: 700 }}
          >
            {club.clubName}
          </Typography>
          <Button
            component={Link}
            to="/status"
            color="inherit"
            size="small"
            startIcon={<SearchIcon />}
            sx={{ mr: 1, display: { xs: 'none', sm: 'inline-flex' } }}
          >
            Bestellstatus
          </Button>
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
      {legalLinks.length > 0 && (
        <Box component="footer" sx={{ px: 2, py: 2, borderTop: 1, borderColor: 'divider' }}>
          <Container maxWidth="md">
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
              {legalLinks.map((link) => (
                <Typography
                  key={link.pageType}
                  component={Link}
                  to={`/recht/${link.slug}`}
                  sx={{ color: 'text.secondary', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  {link.title}
                </Typography>
              ))}
            </Box>
          </Container>
        </Box>
      )}
    </Box>
  );
}
