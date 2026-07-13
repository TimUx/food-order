import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import PaymentsIcon from '@mui/icons-material/Payments';

const BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/timux';
const PAYPAL_URL = 'https://www.paypal.me/timux80';

export function SponsorLinks(props: { compact?: boolean }) {
  const compact = props.compact ?? false;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? 1.5 : 2,
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant={compact ? 'subtitle1' : 'h6'} fontWeight={800} sx={{ mb: 1 }}>
        Sponsor dieses Projekt
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
        <Button
          component="a"
          href={BUY_ME_A_COFFEE_URL}
          target="_blank"
          rel="noreferrer noopener"
          variant="contained"
          color="warning"
          startIcon={<LocalCafeIcon />}
          sx={{ minHeight: 44, flex: 1 }}
        >
          Buy Me a Coffee
        </Button>
        <Button
          component="a"
          href={PAYPAL_URL}
          target="_blank"
          rel="noreferrer noopener"
          variant="outlined"
          color="primary"
          startIcon={<PaymentsIcon />}
          sx={{ minHeight: 44, flex: 1 }}
        >
          PayPal
        </Button>
      </Stack>
      {!compact && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Danke, dass du FestSchmiede unterstützt.
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

