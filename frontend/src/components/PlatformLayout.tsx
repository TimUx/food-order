import { useState } from 'react';
import {
  AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Box, Container, useMediaQuery, useTheme, Avatar,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import ArticleIcon from '@mui/icons-material/Article';
import BackupIcon from '@mui/icons-material/Backup';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GavelIcon from '@mui/icons-material/Gavel';
import LanguageIcon from '@mui/icons-material/Language';
import MemoryIcon from '@mui/icons-material/Memory';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePlatformAuth } from '@/contexts/PlatformAuthContext';
import { usePlatform } from '@/contexts/PlatformProvider';

const DRAWER_WIDTH = 260;

const NAV = [
  { path: '/platform', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/platform/mandanten', label: 'Mandanten', icon: <BusinessIcon /> },
  { path: '/platform/bewerbungen', label: 'Mandantenanträge', icon: <AssignmentIcon /> },
  { path: '/platform/benutzer', label: 'Benutzer', icon: <PeopleIcon /> },
  { path: '/platform/monitoring', label: 'Monitoring', icon: <MemoryIcon /> },
  { path: '/platform/health', label: 'Health', icon: <MonitorHeartIcon /> },
  { path: '/platform/logs', label: 'Logs', icon: <ArticleIcon /> },
  { path: '/platform/backups', label: 'Backups', icon: <BackupIcon /> },
  { path: '/platform/rechtliches', label: 'Rechtliches', icon: <GavelIcon /> },
  { path: '/platform/domains', label: 'Domains', icon: <LanguageIcon /> },
  { path: '/platform/einstellungen', label: 'Einstellungen', icon: <SettingsIcon /> },
];

export function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, logout } = usePlatformAuth();
  const { platform } = usePlatform();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const drawer = (
    <Box sx={{ width: DRAWER_WIDTH, pt: 1 }}>
      <Box sx={{ px: 2, py: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" color="text.secondary">Plattform</Typography>
        <Typography variant="h6" fontWeight={700}>{platform?.name ?? 'FestManager'}</Typography>
      </Box>
      <List>
        {NAV.map((item) => (
          <ListItemButton
            key={item.path}
            component={Link}
            to={item.path}
            selected={location.pathname === item.path}
            onClick={() => isMobile && setDrawerOpen(false)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="fixed" color="default" elevation={1} sx={{ bgcolor: '#0d47a1', color: 'white' }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setDrawerOpen(!drawerOpen)} sx={{ mr: 2, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Plattform-Administration</Typography>
          <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'primary.dark' }}>
            {user?.firstName?.[0]}
          </Avatar>
          <IconButton color="inherit" onClick={() => { logout(); navigate('/platform/login'); }}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer variant="temporary" open={drawerOpen} onClose={() => setDrawerOpen(false)} sx={{ display: { xs: 'block', md: 'none' } }}>
        {drawer}
      </Drawer>
      <Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', mt: '64px' } }} open>
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: '64px', ml: { md: `${DRAWER_WIDTH}px` } }}>
        <Container maxWidth="xl" disableGutters>
          {children}
        </Container>
      </Box>
    </Box>
  );
}
