import { useState } from 'react';
import { Button, Stack, CircularProgress } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import { api } from '@/services/api';
import { printOrdersExport } from '@/utils/ordersPrint';
import { useClub } from '@/contexts/ClubContext';

interface OrdersExportActionsProps {
  token: string;
  eventId: string;
  eventName: string;
  onError: (message: string) => void;
}

export function OrdersExportActions({ token, eventId, eventName, onError }: OrdersExportActionsProps) {
  const { club } = useClub();
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);

  const safeFilename = () => {
    const safe = eventName
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'veranstaltung';
    return `bestellungen-${safe}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  };

  const handleExcelExport = async () => {
    setExporting(true);
    onError('');
    try {
      await api.downloadOrdersExport(token, eventId, safeFilename());
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Excel-Export fehlgeschlagen');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    onError('');
    try {
      const data = await api.getOrdersExport(token, eventId);
      printOrdersExport(data, club.clubName);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Drucken fehlgeschlagen');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
      <Button
        variant="outlined"
        startIcon={printing ? <CircularProgress size={18} /> : <PrintIcon />}
        onClick={() => void handlePrint()}
        disabled={printing || exporting || !eventId}
      >
        Drucken
      </Button>
      <Button
        variant="outlined"
        startIcon={exporting ? <CircularProgress size={18} /> : <DownloadIcon />}
        onClick={() => void handleExcelExport()}
        disabled={exporting || printing || !eventId}
      >
        Excel-Export
      </Button>
    </Stack>
  );
}
