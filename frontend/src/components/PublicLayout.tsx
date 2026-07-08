import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Container,
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { useThemeMode } from '@/contexts/ThemeContext';
import { Link } from 'react-router-dom';

interface PublicLayoutProps {
  children: React.ReactNode;
  title?: string;
  fullWidth?: boolean;
}

export function PublicLayout({ children, title, fullWidth = false }: PublicLayoutProps) {
  const { mode, toggleMode } = useThemeMode();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          <RestaurantMenuIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit', fontWeight: 700 }}
          >
            {title || 'Vereinsbestellung'}
          </Typography>
          <IconButton onClick={toggleMode} color="inherit" aria-label="Design wechseln">
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container
        maxWidth={fullWidth ? false : 'md'}
        sx={{ flexGrow: 1, py: 3, px: { xs: 2, sm: 3 } }}
      >
        {children}
      </Container>
    </Box>
  );
}
