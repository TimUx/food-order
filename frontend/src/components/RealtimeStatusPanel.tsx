import { Paper, Typography, Stack, Chip } from '@mui/material';
import { useRealtimeDiagnostics } from '@/services/realtime';

const STATE_LABELS: Record<string, string> = {
  CONNECTING: 'Verbinde…',
  CONNECTED: 'Live (WebSocket)',
  DEGRADED: 'Eingeschränkt',
  POLLING: 'Polling aktiv',
  RECONNECTING: 'Verbinde erneut…',
  DISCONNECTED: 'Offline',
};

export function RealtimeStatusPanel() {
  const diag = useRealtimeDiagnostics();

  return (
    <Paper sx={{ p: 2, mb: 3 }} variant="outlined">
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        Echtzeit-Verbindung
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          label={STATE_LABELS[diag.state] ?? diag.state}
          color={diag.state === 'CONNECTED' ? 'success' : diag.state === 'DISCONNECTED' ? 'error' : 'warning'}
        />
        <Chip size="small" variant="outlined" label={`Transport: ${diag.transport}`} />
        {diag.pollingIntervalMs != null && (
          <Chip size="small" variant="outlined" label={`Polling: ${Math.round(diag.pollingIntervalMs / 1000)}s`} />
        )}
        <Chip size="small" variant="outlined" label={`Reconnects: ${diag.reconnectCount}`} />
        <Chip size="small" variant="outlined" label={`Kanäle: ${diag.subscriptionCount}`} />
      </Stack>
    </Paper>
  );
}
