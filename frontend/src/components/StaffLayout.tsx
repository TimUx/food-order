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
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import KitchenIcon from '@mui/icons-material/Kitchen';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import EventIcon from '@mui/icons-material/Event';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/contexts/ThemeContext';

const navItems = [
  { path: '/mitarbeiter', label: 'Dashboard', icon: <DashboardIcon />, roles: ['ADMIN', 'STAFF'] },
  { path: '/mitarbeiter/bestellungen', label: 'Bestellungen', icon: <ReceiptLongIcon />, roles: ['ADMIN', 'STAFF'] },
  { path: '/mitarbeiter/kueche', label: 'Küche', icon: <KitchenIcon />, roles: ['ADMIN', 'STAFF'] },
  { path: '/mitarbeiter/kasse', label: 'Kasse', icon: <PointOfSaleIcon />, roles: ['ADMIN', 'STAFF'] },
  { path: '/mitarbeiter/lokale-kasse', label: 'Lokale Kasse', icon: <PointOfSaleIcon />, roles: ['ADMIN', 'STAFF'] },
  { path: '/mitarbeiter/speisen', label: 'Speisen', icon: <RestaurantMenuIcon />, roles: ['ADMIN'] },
  { path: '/mitarbeiter/veranstaltungen', label: 'Veranstaltungen', icon: <EventIcon />, roles: ['ADMIN'] },
];

interface StaffLayoutProps {
  children: React.ReactNode;
  title?: string;
  fullWidth?: boolean;
}

export function StaffLayout({ children, title, fullWidth = false }: StaffLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const filteredNav = navItems.filter(
    (item) => item.roles.includes('ADMIN') && isAdmin || item.roles.includes('STAFF')
  );

  const drawer = (
    <Box sx={{ width: 260, pt: 2 }}>
      <Typography variant="h6" sx={{ px: 2, mb: 2, fontWeight: 700 }}>
        Mitarbeiterbereich
      </Typography>
      <List>
        {filteredNav.map((item) => (
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
        <ListItemButton onClick={() => { logout(); navigate('/mitarbeiter/login'); }}>
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Abmelden" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {!isMobile && (
        <Drawer variant="permanent" sx={{ width: 260, '& .MuiDrawer-paper': { width: 260, boxSizing: 'border-box' } }}>
          {drawer}
        </Drawer>
      )}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky" color="default" elevation={1}>
          <Toolbar>
            {isMobile && (
              <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
              {title || 'Mitarbeiterbereich'}
            </Typography>
            <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <IconButton onClick={toggleMode} aria-label="Design wechseln">
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Toolbar>
        </AppBar>
        <Container maxWidth={fullWidth ? false : 'lg'} sx={{ flexGrow: 1, py: 3 }}>
          {children}
        </Container>
      </Box>
      {isMobile && (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          {drawer}
        </Drawer>
      )}
    </Box>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/mitarbeiter/login" replace />;
  return <>{children}</>;
}
