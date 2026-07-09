import { Alert, Button, Box } from '@mui/material';
import {
  IMPERSONATION_META_KEY,
  PLATFORM_SESSION_BACKUP_KEY,
  PLATFORM_TOKEN_KEY,
  PLATFORM_REFRESH_KEY,
} from '@/services/platformApi';

export function ImpersonationBanner() {
  const metaRaw = localStorage.getItem(IMPERSONATION_META_KEY);
  if (!metaRaw) return null;

  let tenantName = 'Mandant';
  try {
    const meta = JSON.parse(metaRaw) as { name?: string };
    tenantName = meta.name ?? tenantName;
  } catch { /* ignore */ }

  const endImpersonation = () => {
    const backupRaw = localStorage.getItem(PLATFORM_SESSION_BACKUP_KEY);
    localStorage.removeItem(IMPERSONATION_META_KEY);
    localStorage.removeItem('verein_token');
    localStorage.removeItem('verein_refresh_token');

    if (backupRaw) {
      try {
        const backup = JSON.parse(backupRaw) as { platformToken?: string; platformRefresh?: string };
        if (backup.platformToken) localStorage.setItem(PLATFORM_TOKEN_KEY, backup.platformToken);
        if (backup.platformRefresh) localStorage.setItem(PLATFORM_REFRESH_KEY, backup.platformRefresh);
      } catch { /* ignore */ }
      localStorage.removeItem(PLATFORM_SESSION_BACKUP_KEY);
    }
    window.location.href = '/platform';
  };

  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
      <Alert
        severity="warning"
        action={
          <Button color="inherit" size="small" onClick={endImpersonation}>
            Impersonation beenden
          </Button>
        }
      >
        Sie sind als Administrator von „{tenantName}" angemeldet (Impersonation aktiv).
      </Alert>
    </Box>
  );
}
