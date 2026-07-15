import { Button, Box } from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { Link } from 'react-router-dom';
import { compactTouchSquareActionSx } from '@/theme/touch';

interface StaffKioskActionsProps {
  /** Max width of the button grid */
  maxWidth?: number;
}

/**
 * Große Touch-Buttons für Kassen-/Abholmodus und Rückkehr zum Service.
 */
export function StaffKioskActions({ maxWidth = 560 }: StaffKioskActionsProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))' },
        gap: { xs: 1, sm: 1.5 },
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
        sx={compactTouchSquareActionSx}
      >
        <DoneAllIcon />
        Abholung
      </Button>
      <Button
        component={Link}
        to="/mitarbeiter/bestellung"
        variant="contained"
        color="primary"
        sx={compactTouchSquareActionSx}
      >
        <AddShoppingCartIcon />
        Bestellung
      </Button>
      <Button
        component={Link}
        to="/mitarbeiter"
        variant="outlined"
        color="inherit"
        sx={compactTouchSquareActionSx}
      >
        <DashboardIcon />
        Service
      </Button>
    </Box>
  );
}
