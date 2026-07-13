import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import PaymentsIcon from '@mui/icons-material/Payments';

const BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/timux';
const PAYPAL_URL = 'https://www.paypal.me/timux80';

export type SponsorLinksVariant = 'compact' | 'default' | 'prominent' | 'banner';

interface SponsorLinksProps {
  variant?: SponsorLinksVariant;
}

function SponsorButtons({ fullWidth = true }: { fullWidth?: boolean }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ width: fullWidth ? '100%' : 'auto' }}>
      <Button
        component="a"
        href={BUY_ME_A_COFFEE_URL}
        target="_blank"
        rel="noreferrer noopener"
        variant="contained"
        color="warning"
        startIcon={<LocalCafeIcon />}
        sx={{ minHeight: 48, flex: fullWidth ? 1 : undefined, fontWeight: 700 }}
      >
        Buy Me a Coffee
      </Button>
      <Button
        component="a"
        href={PAYPAL_URL}
        target="_blank"
        rel="noreferrer noopener"
        variant="contained"
        color="primary"
        startIcon={<PaymentsIcon />}
        sx={{ minHeight: 48, flex: fullWidth ? 1 : undefined, fontWeight: 700 }}
      >
        PayPal
      </Button>
    </Stack>
  );
}

export function SponsorLinks({ variant = 'default' }: SponsorLinksProps) {
  if (variant === 'banner') {
    return (
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 1.5,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.900' : 'warning.50'),
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="subtitle2" fontWeight={800}>
              Sponsor dieses Projekt
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Unterstütze FestSchmiede mit einem Kaffee oder per PayPal.
            </Typography>
          </Box>
          <SponsorButtons fullWidth={false} />
        </Stack>
      </Paper>
    );
  }

  if (variant === 'prominent') {
    return (
      <Paper
        elevation={2}
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: 3,
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #3e2723 0%, #1a237e 100%)'
              : 'linear-gradient(135deg, #fff8e1 0%, #e3f2fd 100%)',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
          Sponsor dieses Projekt
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2.5, maxWidth: 560 }}>
          FestSchmiede ist Open Source. Wenn dir die Plattform hilft, freue ich mich über einen Kaffee oder eine
          Spende per PayPal.
        </Typography>
        <SponsorButtons />
      </Paper>
    );
  }

  if (variant === 'compact') {
    return (
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
          Sponsor dieses Projekt
        </Typography>
        <SponsorButtons />
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
        Sponsor dieses Projekt
      </Typography>
      <SponsorButtons />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
        Danke, dass du FestSchmiede unterstützt.
      </Typography>
    </Paper>
  );
}
