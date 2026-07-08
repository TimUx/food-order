import { useState, useEffect } from 'react';
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
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import DashboardIcon from '@mui/icons-material/Dashboard';
import KitchenIcon from '@mui/icons-material/Kitchen';
import SettingsIcon from '@mui/icons-material/Settings';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import EventIcon from '@mui/icons-material/Event';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useClub } from '@/contexts/ClubContext';
import { getImageUrl } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeMode } from '@/contexts/ThemeContext';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';

const DRAWER_WIDTH = 260;

const FOCUS_MODE_PATHS = [
  '/mitarbeiter/kueche',
  '/mitarbeiter/abholung',
  '/mitarbeiter/bestellung',
];

const navItems = [
  { path: '/mitarbeiter', label: 'Dashboard', icon: <DashboardIcon />, roles: ['ADMIN', 'STAFF'] },
  { path: '/mitarbeiter/bestellungen', label: 'Bestellungen', icon: <ReceiptLongIcon />, roles: ['ADMIN', 'STAFF'] },
  { path: '/mitarbeiter/kueche', label: 'Küche', icon: <KitchenIcon />, roles: ['ADMIN', 'STAFF'] },
  { path: '/mitarbeiter/abholung', label: 'Abholung', icon: <DoneAllIcon />, roles: ['ADMIN', 'STAFF'] },
  { path: '/mitarbeiter/bestellung', label: 'Bestellung', icon: <AddShoppingCartIcon />, roles: ['ADMIN', 'STAFF'] },
  { path: '/mitarbeiter/speisen', label: 'Speisen', icon: <RestaurantMenuIcon />, roles: ['ADMIN'] },
  { path: '/mitarbeiter/veranstaltungen', label: 'Veranstaltungen', icon: <EventIcon />, roles: ['ADMIN'] },
  { path: '/mitarbeiter/verein', label: 'Verein', icon: <SettingsIcon />, roles: ['ADMIN'] },
];

function isFocusModePath(pathname: string): boolean {
  return FOCUS_MODE_PATHS.includes(pathname);
}

interface StaffLayoutProps {
  children: React.ReactNode;
  title?: string;
  fullWidth?: boolean;
}

export function StaffLayout({ children, title, fullWidth = false }: StaffLayoutProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(true);
  const { user, logout, isAdmin } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { club } = useClub();
  const logoUrl = getImageUrl(club.logoUrl || undefined);

  useEffect(() => {
    setMenuOpen(!isFocusModePath(location.pathname));
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  const filteredNav = navItems.filter(
    (item) => (item.roles.includes('ADMIN') && isAdmin) || item.roles.includes('STAFF')
  );

  const drawerContent = (
    <Box sx={{ width: DRAWER_WIDTH, pt: 2 }}>
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
            onClick={() => setMobileDrawerOpen(false)}
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

  const showDesktopDrawer = !isMobile && menuOpen;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {showDesktopDrawer && (
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
            <IconButton
              edge="start"
              onClick={() => {
                if (isMobile) {
                  setMobileDrawerOpen(true);
                } else {
                  setMenuOpen((prev) => !prev);
                }
              }}
              sx={{ mr: 1 }}
              aria-label={menuOpen ? 'Menü ausblenden' : 'Menü einblenden'}
            >
              {isMobile || !menuOpen ? <MenuIcon /> : <MenuOpenIcon />}
            </IconButton>
            <Typography
              variant="h6"
              sx={{ flexGrow: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}
            >
              {logoUrl && (
                <Avatar src={logoUrl} alt="" sx={{ width: 28, height: 28, flexShrink: 0 }} />
              )}
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title || club.clubName}
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

        <Container
          maxWidth={fullWidth ? false : 'lg'}
          sx={{ flexGrow: 1, py: 3, px: { xs: 2, sm: 3 } }}
        >
          {children}
        </Container>
      </Box>

      <Drawer
        open={isMobile && mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        variant="temporary"
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/mitarbeiter/login" replace />;
  return <>{children}</>;
}
