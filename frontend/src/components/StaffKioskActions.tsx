import { Button, Box } from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { Link } from 'react-router-dom';
import { touchSquareActionSx } from '@/theme/touch';

interface StaffKioskActionsProps {
  /** Max width of the button grid */
  maxWidth?: number;
}

/**
 * Große Touch-Buttons für Kassen-/Abholmodus und Rückkehr zum Mitarbeiterbereich.
 */
export function StaffKioskActions({ maxWidth = 720 }: StaffKioskActionsProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
        gap: 2,
        maxWidth,
        mx: 'auto',
        width: '100%',
      }}
    >
      <Button
        component={Link}
        to="/mitarbeiter/abholung"
        variant="contained"
        color="success"
        sx={touchSquareActionSx}
      >
        <DoneAllIcon />
        Abholung
      </Button>
      <Button
        component={Link}
        to="/mitarbeiter/bestellung"
        variant="contained"
        color="primary"
        sx={touchSquareActionSx}
      >
        <AddShoppingCartIcon />
        Bestellung
      </Button>
      <Button
        component={Link}
        to="/mitarbeiter"
        variant="outlined"
        color="inherit"
        sx={touchSquareActionSx}
      >
        <DashboardIcon />
        Mitarbeiterbereich
      </Button>
    </Box>
  );
}
