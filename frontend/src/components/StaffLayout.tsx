import { useState, useEffect, useRef, useCallback } from 'react';
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
  Alert,
  Snackbar,
  Button,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import DashboardIcon from '@mui/icons-material/Dashboard';
import KitchenIcon from '@mui/icons-material/Kitchen';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { StaffEventSelect } from '@/components/StaffEventSelect';
import { useStaffEvent } from '@/contexts/StaffEventContext';
import { useClub } from '@/contexts/ClubContext';
import { getImageUrl } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessAnyPermission } from '@/utils/permissions';
import { useThemeMode } from '@/contexts/ThemeContext';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useRouting } from '@/contexts/RoutingProvider';
import { startPrintJobListener } from '@/modules/printer/printBridge';
import { realtimeService, useRealtimeConnectionState } from '@/services/realtime';
import type { ConnectionState } from '@/services/realtime';

const DRAWER_WIDTH = 260;

const FOCUS_MODE_PATHS = [
  '/mitarbeiter/kueche',
  '/mitarbeiter/abholung',
  '/mitarbeiter/bestellung',
];

const navItems: Array<{
  path: string;
  label: string;
  icon: React.ReactNode;
  permissions?: string[];
}> = [
  {
    path: '/mitarbeiter',
    label: 'Dashboard',
    icon: <DashboardIcon />,
    permissions: ['orders.view', 'orders.kitchen', 'orders.manage', 'orders.pickup'],
  },
  {
    path: '/mitarbeiter/bestellungen',
    label: 'Bestellungen',
    icon: <ReceiptLongIcon />,
    permissions: ['orders.view', 'orders.kitchen', 'orders.manage', 'orders.pickup'],
  },
  { path: '/mitarbeiter/kueche', label: 'Küche', icon: <KitchenIcon />, permissions: ['orders.kitchen'] },
  { path: '/mitarbeiter/abholung', label: 'Abholung', icon: <DoneAllIcon />, permissions: ['orders.pickup'] },
  { path: '/mitarbeiter/bestellung', label: 'Bestellung', icon: <AddShoppingCartIcon />, permissions: ['orders.manage'] },
  {
    path: '/mitarbeiter/speisen',
    label: 'Verfügbarkeit',
    icon: <RestaurantMenuIcon />,
    permissions: ['food.edit', 'orders.kitchen', 'orders.manage'],
  },
];

function isFocusModePath(pathname: string): boolean {
  return FOCUS_MODE_PATHS.includes(pathname);
}

interface StaffLayoutProps {
  children: React.ReactNode;
  title?: string;
  fullWidth?: boolean;
}

function connectionBanner(state: ConnectionState): { show: boolean; severity: 'warning' | 'error'; text: string } {
  switch (state) {
    case 'RECONNECTING':
      return { show: true, severity: 'warning', text: 'Verbindung wird wiederhergestellt…' };
    case 'DEGRADED':
      return { show: true, severity: 'warning', text: 'Verbindung eingeschränkt – Aktualisierung verzögert' };
    case 'DISCONNECTED':
      return { show: true, severity: 'error', text: 'Offline – Verbindung wird automatisch wiederhergestellt' };
    default:
      return { show: false, severity: 'warning', text: '' };
  }
}

export function StaffLayout({ children, title, fullWidth = false }: StaffLayoutProps) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(true);
  const [reconnectNotice, setReconnectNotice] = useState(false);
  const connectionState = useRealtimeConnectionState();
  const banner = connectionBanner(connectionState);
  const wasDisconnected = useRef(false);
  const { user, logout, isAdmin, token } = useAuth();
  const { routing } = useRouting();
  const { mode, toggleMode } = useThemeMode();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { club } = useClub();
  const logoUrl = getImageUrl(club.logoUrl || undefined);
  const { events, selectedEventId, setSelectedEventId, loading: eventsLoading, error: eventsError } = useStaffEvent();
  const showEventSelect = events.length > 0 || eventsLoading;

  useEffect(() => {
    setMenuOpen(!isFocusModePath(location.pathname));
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    realtimeService.configureAuth(token, routing.tenantSlug);
    realtimeService.connect(token);
  }, [token, routing.tenantSlug]);

  useEffect(() => {
    if (connectionState === 'DISCONNECTED' || connectionState === 'POLLING') {
      wasDisconnected.current = true;
      return;
    }
    if (connectionState === 'CONNECTED' && wasDisconnected.current) {
      setReconnectNotice(true);
      wasDisconnected.current = false;
    }
  }, [connectionState]);

  const handleReconnectClose = useCallback(() => setReconnectNotice(false), []);

  useEffect(() => {
    const unsubPrint = startPrintJobListener();
    return () => unsubPrint();
  }, []);

  const filteredNav = navItems.filter((item) => {
    if (!item.permissions?.length) return true;
    return canAccessAnyPermission(user, item.permissions);
  });

  const drawerContent = (
    <Box sx={{ width: DRAWER_WIDTH, pt: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" sx={{ px: 2, mb: 2, fontWeight: 700 }}>
        Service
      </Typography>
      <List sx={{ flexGrow: 1 }}>
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
        {isAdmin && (
          <ListItemButton component={Link} to="/admin" onClick={() => setMobileDrawerOpen(false)}>
            <ListItemIcon><AdminPanelSettingsIcon /></ListItemIcon>
            <ListItemText primary="Administration" />
          </ListItemButton>
        )}
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
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' },
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
            {isFocusModePath(location.pathname) && (
              <>
                <Button
                  component={Link}
                  to="/mitarbeiter"
                  variant="outlined"
                  size="small"
                  startIcon={<DashboardIcon />}
                  sx={{ mr: 1, display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  Übersicht
                </Button>
                <IconButton
                  component={Link}
                  to="/mitarbeiter"
                  aria-label="Zur Übersicht"
                  sx={{ mr: 1, display: { xs: 'inline-flex', sm: 'none' } }}
                >
                  <DashboardIcon />
                </IconButton>
              </>
            )}
            {showEventSelect && (
              <Box sx={{ mr: 2, display: { xs: 'none', md: 'block' }, flexShrink: 0 }}>
                <StaffEventSelect
                  events={events}
                  value={selectedEventId}
                  onChange={setSelectedEventId}
                  labelId="staff-header-event"
                  compact
                />
              </Box>
            )}
            <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' }, flexShrink: 0 }}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <IconButton onClick={toggleMode} aria-label="Design wechseln">
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Toolbar>
        </AppBar>

        {banner.show && (
          <Alert severity={banner.severity} sx={{ borderRadius: 0 }}>
            {banner.text}
          </Alert>
        )}

        {eventsError && (
          <Alert severity="warning" sx={{ borderRadius: 0 }}>
            {eventsError}
          </Alert>
        )}

        {events.length > 1 && !selectedEventId && (
          <Alert severity="info" sx={{ borderRadius: 0 }}>
            Bitte oben eine Veranstaltung auswählen.
          </Alert>
        )}

        {showEventSelect && (
          <Box sx={{ display: { xs: 'block', md: 'none' }, px: 2, pt: 2 }}>
            <StaffEventSelect
              events={events}
              value={selectedEventId}
              onChange={setSelectedEventId}
              labelId="staff-mobile-event"
            />
          </Box>
        )}

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

      <Snackbar
        open={reconnectNotice}
        autoHideDuration={4000}
        onClose={handleReconnectClose}
        message="Verbindung wiederhergestellt"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/mitarbeiter/login" replace />;
  return <>{children}</>;
}
