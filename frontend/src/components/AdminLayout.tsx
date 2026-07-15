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
  CircularProgress,
  Collapse,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import { useClub } from '@/contexts/ClubContext';
import { getImageUrl } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessPermission, hasDelegatedAdminAccess } from '@/utils/permissions';
import { useThemeMode } from '@/contexts/ThemeContext';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAdminUi } from '@/contexts/AdminUiContext';
import { resolveAdminIcon } from '@/admin/iconMap';

const DRAWER_WIDTH = 260;
const SETTINGS_PARENT_ID = 'settings';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  fullWidth?: boolean;
}

export function AdminLayout({ children, title, fullWidth = false }: AdminLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { club } = useClub();
  const logoUrl = getImageUrl(club.logoUrl || undefined);
  const { catalog, loading } = useAdminUi();
  const showNavLoading = loading && !catalog;

  const allNav = (catalog?.navigation ?? [])
    .filter((item) => canAccessPermission(user, item.requiredPermission));

  const mainNav = allNav
    .filter((item) => !item.parentId)
    .map((item) => ({
      path: item.path,
      label: item.label,
      icon: resolveAdminIcon(item.icon),
    }));

  const settingsNav = allNav
    .filter((item) => item.parentId === SETTINGS_PARENT_ID)
    .map((item) => ({
      path: item.path,
      label: item.label,
      icon: resolveAdminIcon(item.icon),
    }));

  const settingsActive = settingsNav.some((item) => location.pathname === item.path);

  const drawerContent = (
    <Box sx={{ width: DRAWER_WIDTH, pt: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" sx={{ px: 2, mb: 2, fontWeight: 700 }}>
        Administration
      </Typography>
      {showNavLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <List sx={{ flexGrow: 1 }}>
          {mainNav.map((item) => (
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
          {settingsNav.length > 0 && (
            <>
              <ListItemButton
                onClick={() => setSettingsOpen((open) => !open)}
                selected={settingsActive}
              >
                <ListItemIcon><SettingsIcon /></ListItemIcon>
                <ListItemText primary="Einstellungen" />
                {settingsOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={settingsOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {settingsNav.map((item) => (
                    <ListItemButton
                      key={item.path}
                      component={Link}
                      to={item.path}
                      selected={location.pathname === item.path}
                      onClick={() => setDrawerOpen(false)}
                      sx={{ pl: 4 }}
                    >
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </>
          )}
          <ListItemButton component={Link} to="/admin/profil" onClick={() => setDrawerOpen(false)}>
            <ListItemIcon><PersonIcon /></ListItemIcon>
            <ListItemText primary="Mein Profil" />
          </ListItemButton>
          <ListItemButton component={Link} to="/mitarbeiter" onClick={() => setDrawerOpen(false)}>
            <ListItemIcon><StorefrontIcon /></ListItemIcon>
            <ListItemText primary="Service" />
          </ListItemButton>
          <ListItemButton onClick={() => { logout(); navigate('/admin/login'); }}>
            <ListItemIcon><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Abmelden" />
          </ListItemButton>
        </List>
      )}
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
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' },
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
  if (!hasDelegatedAdminAccess(user)) return <Navigate to="/mitarbeiter" replace />;
  return <>{children}</>;
}
