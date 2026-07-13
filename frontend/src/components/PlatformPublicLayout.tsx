import { useEffect, useState } from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, Container, IconButton, Drawer, List,
  ListItemButton, ListItemText, ListSubheader, Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { Link, useLocation } from 'react-router-dom';
import { FestSchmiedeLogo } from '@/components/FestSchmiedeLogo';
import { useThemeMode } from '@/contexts/ThemeContext';
import { usePlatform } from '@/contexts/PlatformProvider';
import { useRouting } from '@/contexts/RoutingProvider';
import { api } from '@/services/api';
import type { PlatformLegalLink } from '@/types/tenant';
import { SponsorLinks } from '@/components/SponsorLinks';

function isNavActive(path: string, pathname: string, hash: string): boolean {
  if (path.includes('#')) {
    const anchor = path.split('#')[1];
    return pathname === '/' && hash === `#${anchor}`;
  }
  return pathname === path;
}

type PrimaryNavItem = {
  label: string;
  path: string;
  shortLabel?: string;
  cta?: boolean;
};

const PRIMARY_NAV: PrimaryNavItem[] = [
  { label: 'Start', path: '/' },
  { label: 'Über das Projekt', path: '/ueber-das-projekt', shortLabel: 'Projekt' },
  { label: 'Über den Entwickler', path: '/ueber-den-entwickler', shortLabel: 'Entwickler' },
  { label: 'Mandant beantragen', path: '/mandant-beantragen', shortLabel: 'Beantragen', cta: true },
];

const NAV_GROUPS = [
  {
    title: 'Produkt',
    items: [
      { label: 'Bestellprozess', path: '/#bestellprozess' },
      { label: 'Funktionen', path: '/funktionen' },
      { label: 'Screenshots', path: '/screenshots' },
    ],
  },
  {
    title: 'Projekt',
    items: [
      { label: 'Open Source', path: '/open-source' },
      { label: 'Für Vereine', path: '/fuer-vereine' },
    ],
  },
  {
    title: 'Hilfe & Kontakt',
    items: [
      { label: 'FAQ', path: '/faq' },
      { label: 'Kontakt', path: '/kontakt' },
      { label: 'Dokumentation', path: '/dokumentation' },
    ],
  },
] as const;

interface PlatformPublicLayoutProps {
  children: React.ReactNode;
}

function NavDrawer({
  open,
  onClose,
  platformName,
  pathname,
  hash,
  loginUrl,
}: {
  open: boolean;
  onClose: () => void;
  platformName: string;
  pathname: string;
  hash: string;
  loginUrl: string;
}) {
  return (
    <Drawer open={open} onClose={onClose} anchor="right">
      <Box sx={{ width: { xs: 300, sm: 320 }, pt: 1 }} role="navigation" aria-label="Seitennavigation">
        <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <FestSchmiedeLogo size="drawer" variant="onSurface" />
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {platformName}
          </Typography>
        </Box>

        <List dense disablePadding>
          <ListSubheader sx={{ bgcolor: 'background.paper', lineHeight: '36px' }}>Direkt</ListSubheader>
          {PRIMARY_NAV.map((item) => (
            <ListItemButton
              key={item.path}
              component={Link}
              to={item.path}
              selected={isNavActive(item.path, pathname, hash)}
              onClick={onClose}
              sx={item.cta ? { bgcolor: 'action.hover' } : undefined}
            >
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontWeight: item.cta ? 700 : 500 }}
              />
            </ListItemButton>
          ))}
        </List>

        {NAV_GROUPS.map((group) => (
          <List key={group.title} dense disablePadding>
            <ListSubheader sx={{ bgcolor: 'background.paper', lineHeight: '36px' }}>
              {group.title}
            </ListSubheader>
            {group.items.map((item) => (
              <ListItemButton
                key={item.path}
                component={Link}
                to={item.path}
                selected={isNavActive(item.path, pathname, hash)}
                onClick={onClose}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        ))}

        <Divider sx={{ my: 1 }} />
        <List dense disablePadding>
          <ListItemButton component="a" href={loginUrl} onClick={onClose}>
            <ListItemText primary="Anmelden" />
          </ListItemButton>
        </List>
      </Box>
    </Drawer>
  );
}

export function PlatformPublicLayout({ children }: PlatformPublicLayoutProps) {
  const { mode, toggleMode } = useThemeMode();
  const { platform } = usePlatform();
  const { routing } = useRouting();
  const location = useLocation();
  const loginUrl = `${routing.appUrl}/platform/login`;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [legalLinks, setLegalLinks] = useState<PlatformLegalLink[]>([]);

  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.pathname, location.hash]);

  useEffect(() => {
    api.getPlatformLegalLinks()
      .then((r) => setLegalLinks(r.items))
      .catch(() => setLegalLinks([]));
  }, []);

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="fixed" elevation={1} color="primary">
        <Toolbar sx={{ gap: 0.5 }}>
          <Box
            component={Link}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              textDecoration: 'none',
              color: 'inherit',
              minWidth: 0,
              mr: { xs: 0.5, sm: 1 },
            }}
          >
            <FestSchmiedeLogo size="header" variant="onPrimary" />
            <Typography variant="h6" fontWeight={700} noWrap sx={{ display: { xs: 'none', sm: 'block' } }}>
              {platform.name}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexGrow: 1, justifyContent: 'flex-end' }}>
            {PRIMARY_NAV.map((item) => (
              <Button
                key={item.path}
                component={Link}
                to={item.path}
                color="inherit"
                size="small"
                variant={item.cta ? 'contained' : 'text'}
                sx={{
                  fontWeight: isNavActive(item.path, location.pathname, location.hash) ? 700 : 500,
                  whiteSpace: 'nowrap',
                  ...(item.cta && {
                    bgcolor: 'primary.contrastText',
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'grey.100' },
                  }),
                }}
              >
                {item.shortLabel ? (
                  <>
                    <Box component="span" sx={{ display: { xs: 'none', lg: 'inline' } }}>{item.label}</Box>
                    <Box component="span" sx={{ display: { xs: 'inline', lg: 'none' } }}>{item.shortLabel}</Box>
                  </>
                ) : (
                  item.label
                )}
              </Button>
            ))}
          </Box>

          <IconButton
            color="inherit"
            onClick={() => setDrawerOpen(true)}
            aria-label="Menü öffnen"
            sx={{ ml: 0.5 }}
          >
            <MenuIcon />
          </IconButton>

          <IconButton onClick={toggleMode} color="inherit" aria-label="Design wechseln">
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <NavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        platformName={platform.name}
        pathname={location.pathname}
        hash={location.hash}
        loginUrl={loginUrl}
      />

      <Toolbar />
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
      <Box component="footer" sx={{ py: 3, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="md">
          <Box sx={{ mb: 3 }}>
            <SponsorLinks variant="prominent" />
          </Box>
          {platform.footerText && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
              {platform.footerText}
            </Typography>
          )}
          {legalLinks.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
              {legalLinks.map((link) => (
                <Typography
                  key={link.slug}
                  component={Link}
                  to={`/rechtliches/${link.slug}`}
                  variant="body2"
                  color="text.secondary"
                  sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  {link.title}
                </Typography>
              ))}
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 1 }}>
            <FestSchmiedeLogo size="footer" variant="onSurface" />
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" align="center">
            © {new Date().getFullYear()} {platform.name}
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
