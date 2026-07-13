import { useState } from 'react';
import { Alert, Button, Box, CircularProgress } from '@mui/material';
import { useRouting } from '@/contexts/RoutingProvider';
import {
  IMPERSONATION_META_KEY,
  PLATFORM_SESSION_BACKUP_KEY,
  PLATFORM_TOKEN_KEY,
  PLATFORM_REFRESH_KEY,
  platformApi,
} from '@/services/platformApi';
import { clearTenantImpersonationTokens } from '@/utils/impersonation';

interface ImpersonationMeta {
  id?: string;
  name?: string;
  slug?: string;
  platformSessionId?: string;
}

export function ImpersonationBanner() {
  const { routing } = useRouting();
  const [ending, setEnding] = useState(false);
  const metaRaw = localStorage.getItem(IMPERSONATION_META_KEY);
  if (!metaRaw) return null;

  let meta: ImpersonationMeta = {};
  try {
    meta = JSON.parse(metaRaw) as ImpersonationMeta;
  } catch {
    /* ignore */
  }

  const tenantName = meta.name ?? 'Mandant';

  const endImpersonation = async () => {
    if (ending) return;
    setEnding(true);

    try {
      const backupRaw = localStorage.getItem(PLATFORM_SESSION_BACKUP_KEY);
      let platformToken = '';
      let platformRefresh = '';
      if (backupRaw) {
        try {
          const backup = JSON.parse(backupRaw) as {
            platformToken?: string;
            platformRefresh?: string;
          };
          platformToken = backup.platformToken ?? '';
          platformRefresh = backup.platformRefresh ?? '';
        } catch {
          /* ignore */
        }
      }

      if (platformToken && meta.platformSessionId) {
        try {
          const result = await platformApi.endImpersonation(
            platformToken,
            meta.platformSessionId
          );
          platformToken = result.token;
        } catch {
          // Audit-Ende optional bei abgelaufener Session — lokale Session trotzdem beenden
        }
      }

      localStorage.removeItem(IMPERSONATION_META_KEY);
      clearTenantImpersonationTokens(meta.slug);

      if (platformToken) {
        localStorage.setItem(PLATFORM_TOKEN_KEY, platformToken);
      }
      if (platformRefresh) {
        localStorage.setItem(PLATFORM_REFRESH_KEY, platformRefresh);
      }
      localStorage.removeItem(PLATFORM_SESSION_BACKUP_KEY);

      window.location.href = `${routing.platformUrl}/platform`;
    } finally {
      setEnding(false);
    }
  };

  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
      <Alert
        severity="warning"
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => void endImpersonation()}
            disabled={ending}
            startIcon={ending ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            Impersonation beenden
          </Button>
        }
      >
        Sie sind als Administrator von „{tenantName}" angemeldet (Impersonation aktiv — wird
        protokolliert).
      </Alert>
    </Box>
  );
}
