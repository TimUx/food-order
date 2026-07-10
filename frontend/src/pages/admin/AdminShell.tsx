import { AdminRoute } from '@/components/AdminLayout';
import { SetupGate } from '@/components/SetupGate';
import { AdminUiProvider } from '@/contexts/AdminUiContext';
import { DynamicAdminPage } from '@/pages/admin/DynamicAdminPage';

export function AdminShell() {
  return (
    <AdminRoute>
      <SetupGate>
        <AdminUiProvider>
          <DynamicAdminPage />
        </AdminUiProvider>
      </SetupGate>
    </AdminRoute>
  );
}
