import { useState } from 'react';
import {
  Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Box, CircularProgress, Alert, IconButton, Tooltip,
  Stack, Menu, MenuItem as MuiMenuItem,
} from '@mui/material';
import ExtensionIcon from '@mui/icons-material/Extension';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import { AdminLayout } from '@/components/AdminLayout';
import { useModules, MODULE_STATUS_LABELS, type ModuleInfo, type ModuleStatus } from '@/module-system';

const healthConfig = {
  healthy: { label: 'Gesund', color: 'success' as const, icon: <CheckCircleIcon fontSize="small" /> },
  degraded: { label: 'Eingeschränkt', color: 'warning' as const, icon: <WarningIcon fontSize="small" /> },
  unhealthy: { label: 'Fehler', color: 'error' as const, icon: <ErrorIcon fontSize="small" /> },
  unknown: { label: 'Unbekannt', color: 'default' as const, icon: <HelpOutlineIcon fontSize="small" /> },
};

const statusColors: Record<ModuleStatus, 'default' | 'success' | 'warning' | 'info' | 'error'> = {
  AVAILABLE: 'default',
  INSTALLED: 'info',
  ACTIVATED: 'success',
  DISABLED: 'warning',
  UNINSTALLED: 'default',
};

function ModuleActions({ mod, onAction, busy }: {
  mod: ModuleInfo;
  busy: boolean;
  onAction: (action: string, id: string) => Promise<void>;
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const actions: { key: string; label: string; show: boolean }[] = [
    { key: 'install', label: 'Installieren', show: ['AVAILABLE', 'UNINSTALLED'].includes(mod.status) },
    { key: 'activate', label: 'Aktivieren', show: ['INSTALLED', 'DISABLED'].includes(mod.status) },
    { key: 'deactivate', label: 'Deaktivieren', show: mod.status === 'ACTIVATED' },
    { key: 'uninstall', label: 'Deinstallieren', show: mod.installed && mod.status !== 'ACTIVATED' },
    { key: 'reinitialize', label: 'Neu initialisieren', show: mod.installed },
    { key: 'health', label: 'Health Check', show: mod.installed },
  ];

  const visible = actions.filter((a) => a.show);
  if (visible.length === 0) return null;

  return (
    <>
      <IconButton size="small" disabled={busy} onClick={(e) => setAnchor(e.currentTarget)}>
        {busy ? <CircularProgress size={20} /> : <MoreVertIcon />}
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {visible.map((a) => (
          <MuiMenuItem
            key={a.key}
            onClick={() => { setAnchor(null); void onAction(a.key, mod.id); }}
          >
            {a.label}
          </MuiMenuItem>
        ))}
      </Menu>
    </>
  );
}

export function FeatureModulesPage() {
  const {
    modules, loading, error, reload,
    installModule, uninstallModule, activateModule, deactivateModule,
    reinitializeModule, healthCheck,
  } = useModules();
  const [actionId, setActionId] = useState<string | null>(null);

  const handleAction = async (action: string, id: string) => {
    setActionId(id);
    try {
      switch (action) {
        case 'install': await installModule(id); break;
        case 'activate': await activateModule(id); break;
        case 'deactivate': await deactivateModule(id); break;
        case 'uninstall': await uninstallModule(id); break;
        case 'reinitialize': await reinitializeModule(id); break;
        case 'health': await healthCheck(id); break;
      }
    } finally {
      setActionId(null);
    }
  };

  return (
    <AdminLayout title="Module">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <ExtensionIcon color="primary" />
        <Typography variant="h4" fontWeight={800}>Module</Typography>
        <Tooltip title="Aktualisieren">
          <IconButton onClick={() => void reload()} sx={{ ml: 'auto' }}><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Offizielle Module werden mit dem Docker-Image ausgeliefert. Keine Downloads, keine Dateikopien – nur Installieren und Aktivieren.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Installiert</TableCell>
                <TableCell>Aktiviert</TableCell>
                <TableCell>Health</TableCell>
                <TableCell>Abhängigkeiten</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {modules.map((mod) => {
                const health = healthConfig[mod.flags.health] ?? healthConfig.unknown;
                const deps = [
                  ...mod.dependencies.required.map((d) => `${d} *`),
                  ...mod.dependencies.optional.map((d) => `${d}?`),
                ];
                return (
                  <TableRow key={mod.id}>
                    <TableCell>
                      <Typography fontWeight={600}>{mod.name}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">{mod.description}</Typography>
                      <Typography variant="caption" color="text.secondary">{mod.id}</Typography>
                      {mod.upgradeAvailable && (
                        <Chip
                          icon={<SystemUpdateAltIcon />}
                          label="Update verfügbar"
                          size="small"
                          color="info"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>{mod.version}</TableCell>
                    <TableCell>
                      <Chip
                        label={MODULE_STATUS_LABELS[mod.status]}
                        color={statusColors[mod.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{mod.installed ? 'Ja' : 'Nein'}</TableCell>
                    <TableCell>{mod.enabled ? 'Ja' : 'Nein'}</TableCell>
                    <TableCell>
                      <Chip icon={health.icon} label={health.label} color={health.color} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {deps.length > 0 ? (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {deps.map((d) => <Chip key={d} label={d} size="small" variant="outlined" />)}
                        </Stack>
                      ) : '–'}
                    </TableCell>
                    <TableCell align="right">
                      <ModuleActions mod={mod} busy={actionId === mod.id} onAction={handleAction} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </AdminLayout>
  );
}
