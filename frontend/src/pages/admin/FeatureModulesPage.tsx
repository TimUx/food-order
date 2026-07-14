import { useState, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Box, CircularProgress, Alert, Switch, Button, Chip, Collapse, IconButton,
} from '@mui/material';
import ExtensionIcon from '@mui/icons-material/Extension';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { AdminLayout } from '@/components/AdminLayout';
import { useModules, type ModuleInfo } from '@/module-system';

function isEntitledModule(mod: ModuleInfo): boolean {
  return mod.entitled === true;
}

function publicStatus(mod: ModuleInfo): string {
  if (mod.status === 'ENABLED') return 'Aktiv';
  if (mod.status === 'FAILED') return 'Fehler';
  return 'Deaktiviert';
}

function statusChipColor(mod: ModuleInfo): 'success' | 'warning' | 'default' {
  if (mod.status === 'ENABLED') return 'success';
  if (mod.status === 'FAILED') return 'warning';
  return 'default';
}

function hasTechnicalDetails(mod: ModuleInfo): boolean {
  return Boolean(mod.lastError || mod.version || mod.upgradeAvailable);
}

export function FeatureModulesPage() {
  const navigate = useNavigate();
  const {
    modules, loading, error,
    enableModule, deactivateModule, upgradeModule,
  } = useModules();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visibleModules = modules.filter(isEntitledModule);

  const handleToggle = async (mod: ModuleInfo, enable: boolean) => {
    setBusyId(mod.id);
    try {
      if (enable) {
        await enableModule(mod.id);
      } else if (mod.status === 'ENABLED') {
        await deactivateModule(mod.id);
      }
    } finally {
      setBusyId(null);
    }
  };

  const runUpgrade = async (mod: ModuleInfo) => {
    setBusyId(mod.id);
    try {
      await upgradeModule(mod.id);
    } finally {
      setBusyId(null);
    }
  };

  const openSettings = (mod: ModuleInfo) => {
    if (mod.id === 'payment') {
      navigate('/admin/payment?tab=presets');
      return;
    }
    if (mod.id === 'legal') {
      navigate('/admin/legal');
      return;
    }
    if (mod.settingsPath) {
      navigate(mod.settingsPath);
    }
  };

  return (
    <AdminLayout title="Funktionen">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <ExtensionIcon color="primary" />
        <Typography variant="h4" fontWeight={800}>Funktionen</Typography>
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Zusätzliche Funktionen für Ihren Veranstalter ein- oder ausschalten.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell width={48} />
                <TableCell>Funktion</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleModules.map((mod) => {
                const isOn = mod.status === 'ENABLED';
                const busy = busyId === mod.id;
                const canConfigure = mod.installed && (mod.settingsPath || mod.id === 'payment' || mod.id === 'legal');
                const showTechnical = hasTechnicalDetails(mod);
                const expanded = expandedId === mod.id;
                return (
                  <Fragment key={mod.id}>
                    <TableRow>
                      <TableCell padding="checkbox">
                        {showTechnical && (
                          <IconButton
                            size="small"
                            aria-label={expanded ? 'Technische Details ausblenden' : 'Erweitert anzeigen'}
                            onClick={() => setExpandedId(expanded ? null : mod.id)}
                          >
                            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={600}>{mod.name}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {mod.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={publicStatus(mod)}
                          color={statusChipColor(mod)}
                          variant={isOn ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                          {canConfigure && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<SettingsIcon />}
                              onClick={() => openSettings(mod)}
                            >
                              Konfigurieren
                            </Button>
                          )}
                          <Switch
                            checked={isOn}
                            disabled={busy || mod.status === 'UPGRADING'}
                            onChange={(e) => void handleToggle(mod, e.target.checked)}
                            inputProps={{ 'aria-label': `${mod.name} ${isOn ? 'deaktivieren' : 'aktivieren'}` }}
                          />
                          {busy && <CircularProgress size={20} />}
                        </Box>
                      </TableCell>
                    </TableRow>
                    {showTechnical && (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ py: 0, borderBottom: expanded ? undefined : 0 }}>
                          <Collapse in={expanded} timeout="auto" unmountOnExit>
                            <Box sx={{ py: 2, pl: 6 }}>
                              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                Erweitert
                              </Typography>
                              {mod.version && (
                                <Typography variant="body2" color="text.secondary">
                                  Version: {mod.version}
                                </Typography>
                              )}
                              {mod.upgradeAvailable && (
                                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                  <Typography variant="body2" color="warning.main">
                                    Aktualisierung verfügbar
                                  </Typography>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    disabled={busy}
                                    onClick={() => void runUpgrade(mod)}
                                  >
                                    Aktualisieren
                                  </Button>
                                </Box>
                              )}
                              {mod.lastError && (
                                <Alert severity="warning" sx={{ mt: 1 }}>{mod.lastError}</Alert>
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </AdminLayout>
  );
}
