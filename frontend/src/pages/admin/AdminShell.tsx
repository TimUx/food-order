import { AdminRoute } from '@/components/AdminLayout';
import { SetupGate } from '@/components/SetupGate';
import { AdminUiProvider } from '@/contexts/AdminUiContext';
import { DynamicAdminPage } from '@/pages/admin/DynamicAdminPage';
import type { ReactNode } from 'react';

/** Stellt Admin-UI-Katalog bereit (Navigation, dynamische Seiten). */
export function AdminUiScope({ children }: { children: ReactNode }) {
  return <AdminUiProvider>{children}</AdminUiProvider>;
}

export function AdminShell() {
  return (
    <AdminRoute>
      <SetupGate>
        <AdminUiScope>
          <DynamicAdminPage />
        </AdminUiScope>
      </SetupGate>
    </AdminRoute>
  );
}
