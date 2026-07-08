import { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Container,
  useMediaQuery,
  useTheme,
  Avatar,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import EventIcon from '@mui/icons-material/Event';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ExtensionIcon from '@mui/icons-material/Extension';
import { useClub } from '@/contexts/ClubContext';
import { getImageUrl } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/contexts/ThemeContext';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useModuleMenuItems } from '@/module-system';

const DRAWER_WIDTH = 260;

const coreNavItems = [
  { path: '/admin', label: 'Übersicht', icon: <DashboardIcon /> },
  { path: '/admin/verein', label: 'Verein & Kontakt', icon: <SettingsIcon /> },
  { path: '/admin/benutzer', label: 'Benutzer', icon: <PeopleIcon /> },
  { path: '/admin/veranstaltungen', label: 'Veranstaltungen', icon: <EventIcon /> },
  { path: '/admin/speisen', label: 'Speisen', icon: <RestaurantMenuIcon /> },
  { path: '/admin/module', label: 'Module', icon: <ExtensionIcon /> },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  fullWidth?: boolean;
}

export function AdminLayout({ children, title, fullWidth = false }: AdminLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { club } = useClub();
  const logoUrl = getImageUrl(club.logoUrl || undefined);
  const moduleMenuItems = useModuleMenuItems();

  const navItems = [
    ...coreNavItems,
    ...moduleMenuItems.map((item) => ({
      path: item.path,
      label: item.label,
      icon: <ExtensionIcon />,
    })),
  ];

  const drawerContent = (
    <Box sx={{ width: DRAWER_WIDTH, pt: 2 }}>
      <Typography variant="h6" sx={{ px: 2, mb: 2, fontWeight: 700 }}>
        Administration
      </Typography>
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            component={Link}
            to={item.path}
            selected={location.pathname === item.path}
            onClick={() => setDrawerOpen(false)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
        <ListItemButton component={Link} to="/mitarbeiter" onClick={() => setDrawerOpen(false)}>
          <ListItemIcon><StorefrontIcon /></ListItemIcon>
          <ListItemText primary="Mitarbeiterbereich" />
        </ListItemButton>
        <ListItemButton onClick={() => { logout(); navigate('/admin/login'); }}>
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Abmelden" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar position="sticky" color="default" elevation={1}>
          <Toolbar>
            {isMobile && (
              <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }} aria-label="Menü">
                <MenuIcon />
              </IconButton>
            )}
            <Typography
              variant="h6"
              sx={{ flexGrow: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}
            >
              {logoUrl && <Avatar src={logoUrl} alt="" sx={{ width: 28, height: 28, flexShrink: 0 }} />}
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title || 'Administration'}
              </Box>
            </Typography>
            <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <IconButton onClick={toggleMode} aria-label="Design wechseln">
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Toolbar>
        </AppBar>

        <Container maxWidth={fullWidth ? false : 'lg'} sx={{ flexGrow: 1, py: 3, px: { xs: 2, sm: 3 } }}>
          {children}
        </Container>
      </Box>

      <Drawer open={isMobile && drawerOpen} onClose={() => setDrawerOpen(false)} variant="temporary">
        {drawerContent}
      </Drawer>
    </Box>
  );
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/mitarbeiter" replace />;
  return <>{children}</>;
}
